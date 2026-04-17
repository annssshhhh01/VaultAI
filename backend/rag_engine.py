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
    temperature=0.7,
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
    retrieval_score=vector_store.similarity_search_with_score(query,k=10)
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
            "score":float(score)
        })   


    concatinated_content="\n\n".join(content)
    return concatinated_content,extradata 

def llm_call(vector_store,question):
    concatinated_content,extradata=retrieve_content(vector_store,question)
    if concatinated_content is None:
        return {
            "answer": "I don't know",
            "sources": []
        }
    prompt = PromptTemplate(
    template="""
    system_prompt = (
    "You are a helpful and direct AI Assistant. "
    "Your primary goal is to provide specific answers based on the provided context. "
    "\n\nSTRICT RULES:"
    "\n1. NO META-TALK: Never start with 'According to the document,' 'The context says,' or 'Based on my analysis.' Just provide the answer."
    "\n2. GREETINGS: If the user says 'hi', 'hello', or 'hey', respond with: 'Hello! I am your document assistant. How can I help you with the uploaded file today?'"
    "\n3. NO BUZZWORDS: Avoid corporate jargon. Use simple, clear, and professional language."
    "\n4. DIRECT ANSWERS: If the user asks a specific question (e.g., 'What is my roll number?'), reply with ONLY the answer (e.g., 'Your roll number is 13152490.')."
    "\n5. FALLBACK: If the answer is absolutely not in the context, say: 'I couldn't find that specific information in the document. Could you try rephrasing or asking something else?'"
)

    CONTEXT:
    {content_text}

    USER QUESTION:
    {question}
    (Think step-by-step about whether the context is sufficient...)
    """,
    input_variables=["content_text", "question"]
)
    final_prompt=prompt.format(content_text=concatinated_content,question=question)
    result=llm.invoke(final_prompt)
    return {
        "answer": result.content,
        "sources": extradata
    }