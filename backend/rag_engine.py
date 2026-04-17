from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq 
from langchain_community.document_loaders import TextLoader,PyPDFLoader
from dotenv import load_dotenv
import os

load_dotenv()
llm = ChatGroq(
    model="llama-3.3-70b-versatile",  # or other Groq models like "mixtral-8x7b-32768"
    temperature=0.3,
    groq_api_key=os.getenv("GROQ_API_KEY")  # Optional: it will auto-load from env
)
embeddings=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
def document_loader(file_path):
    """
    if it is in .txt then we will call Textloader 
    if it is in pdf format then we will call PyPDFloader
    """
    if file_path.endswith(".txt"):  
        #  uvicorn main:app --reload
        loader=TextLoader(file_path)
    elif file_path.endswith(".pdf"):
        loader=PyPDFLoader(file_path)
    else:
        raise ValueError("file not supported")    
    documents=loader.load()        
    return documents

def ingest_document(documents, is_audio=False):
    if not is_audio:
        splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=20)
        docs = splitter.split_documents(documents)
    else:
        docs = documents  # 🔥 skip splitting for audio

    for i in range(len(docs)):
        docs[i].metadata["chunk_id"] = i       

    vector_store = FAISS.from_documents(docs, embeddings)
    return vector_store

def retrieve_content(vector_store,query):
    retrieval_score=vector_store.similarity_search_with_score(query,k=3)
    if not retrieval_score:
        return None, None
    
    # in short in the retrieval_score we have the structure like document=[(doc1,score),(doc22,score)] note that it is tuple so what we will do is
    content=[]
    extradata=[]
    for doc,score in retrieval_score:
        content.append(doc.page_content)
        extradata.append({
            "source":doc.metadata.get("source"),
            "chunk_id":doc.metadata.get("chunk_id"),
            "timestamp": doc.metadata.get("timestamp"),
            "score":float(score)
        })   


    concatinated_content="\n\n".join(content)
    return concatinated_content,extradata 
def summarize_call(vector_store):
    docs = vector_store.similarity_search("", k=5)

    content = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are a helpful assistant.

Summarize the following content clearly and concisely.

CONTENT:
{content}
"""

    result = llm.invoke(prompt)

    return {
        "answer": result.content
    }

def llm_call(vector_store,question):
    concatinated_content,extradata=retrieve_content(vector_store,question)
    if concatinated_content is None:
        return {
            "answer": "I don't know",
            "sources": []
        }
    prompt = PromptTemplate(
    template="""
    You are a helpful and direct AI assistant.

    STRICT RULES:
    1. Answer ONLY using the given context.
    2. Give clear and direct answers (no explanations unless asked).
    3. Do NOT mention the word "context" or "document".
    4. If the answer is not clearly present, say:
    "I couldn't find that information in the provided data."

    CONTEXT:
    {content_text}

    QUESTION:
    {question}
    """,
    input_variables=["content_text", "question"]
)
    final_prompt=prompt.format(content_text=concatinated_content,question=question)
    result=llm.invoke(final_prompt)
    top_timestamp = extradata[0].get("timestamp") if extradata else None
    return {
        "answer": result.content,
        "timestamp": top_timestamp,
        "sources": extradata
    }