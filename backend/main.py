from fastapi import FastAPI,UploadFile,File,HTTPException
from pydantic import BaseModel,Field
import shutil # it is mainly use to copy remove 
import os # its an operating system use to do various work
from rag_engine import document_loader,ingest_document,llm_call,summarize_call
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import whisper
import subprocess
from langchain_core.documents import Document
app = FastAPI()
vector_store = None
import psycopg2

conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)

cursor = conn.cursor()

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
       for doc in document:
        cursor.execute(
            "INSERT INTO documents (text, timestamp, source, type) VALUES (%s, %s, %s, %s)",
            (doc.page_content, None, file.filename, "pdf")
        )

        conn.commit()
       vector_store= ingest_document(document)    
       return {"message":f"file {file.filename} is uploaded and vectorized"}
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    
@app.post("/ask")
async def ask_question(request: Question):
    global vector_store

    if vector_store is None:
        raise HTTPException(status_code=400, detail="Please Upload a Document first.")

    # 🔥 Detect summarization
    if "summarize" in request.question.lower():
        result = summarize_call(vector_store)
    else:
        result = llm_call(vector_store, request.question)

    return result 


model = whisper.load_model("base")  # load once (important)

@app.post("/upload/media")
async def upload_media(file: UploadFile = File(...)):

    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    ext = file.filename.split(".")[-1].lower()

    if ext in ["mp3", "wav", "m4a"]:
        audio_path = file_path

    elif ext in ["mp4", "mov", "mkv"]:
        audio_path = file_path + ".mp3"

        subprocess.run([
            "ffmpeg",
            "-y",
            "-i", file_path,
            "-q:a", "0",
            "-map", "a",
            audio_path
        ])

    else:
        return {"error": "Unsupported file type"}

    # 🎤 Whisper (uses global model)
    result = model.transcribe(audio_path)
    segments = result["segments"]

    docs = []
    for s in segments:
        cursor.execute(
        "INSERT INTO documents (text, timestamp, source, type) VALUES (%s, %s, %s, %s)",
        (s["text"], s["start"], file.filename, "audio")
    )
        docs.append(
            Document(
                page_content=s["text"],
                metadata={
                    "timestamp": s["start"],
                    "source": file.filename
                }
            )
        )
    conn.commit()
    


    global vector_store
    vector_store = ingest_document(docs, is_audio=True)

    return {"message": "File processed successfully"}