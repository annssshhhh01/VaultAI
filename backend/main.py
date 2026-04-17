from fastapi import FastAPI,UploadFile,File,HTTPException
from pydantic import BaseModel,Field
import shutil # it is mainly use to copy remove 
import os # its an operating system use to do various work
from rag_engine import document_loader,ingest_document,llm_call
from fastapi.middleware.cors import CORSMiddleware
app=FastAPI()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import whisper
from langchain_core.documents import Document
app = FastAPI()
vector_store = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_doc="uploads"
os.makedirs(upload_doc,exist_ok=True)
vector_store=None
class Question(BaseModel):
    question:str 
from fastapi.middleware.cors import CORSMiddleware

# ... after app = FastAPI() ...


@app.get("/")
def root():
    return {"message":"RAG engine is running"}

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload_file(file:UploadFile=File(...)):
    global vector_store
    file_path=os.path.join(upload_doc,file.filename)
    with open(file_path,"wb") as f:   #we can use wb when the file has not only text but images etc as they need to b converted into binary
        shutil.copyfileobj(file.file,f)
    try:
       document=document_loader(file_path)
       vector_store= ingest_document(document)    
       return {"message":f"file {file.filename} is uploaded and vectorized"}
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    
@app.post("/ask")
async def ask_question(request:Question):
    print("sm")
    global vector_store
    if vector_store is None:
       print("cool")
       raise HTTPException(status_code=400,detail="Please Upload a Document first.")
    result=llm_call(vector_store,request.question) 
    return result   


model = whisper.load_model("base")  # load once (important)

@app.post("/upload/audio")
async def transcribe_audio(file: UploadFile = File(...)):
    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    result = model.transcribe(file_path)
    segments = result["segments"]

    # STEP 1: chunks
    chunks = []
    for s in segments:
        chunks.append({
            "text": s["text"],
            "timestamp": s["start"]
        })

    # STEP 2: convert to docs
    docs = []

    for c in chunks:
        docs.append(
            Document(
                page_content=c["text"],
                metadata={
                    "timestamp": c["timestamp"],
                    "source": file.filename
                }
            )
        )

    # 🔥 THIS IS THE KEY LINE
    global vector_store
    vector_store = ingest_document(docs, is_audio=True)
    return {"message": "Audio processed successfully"}