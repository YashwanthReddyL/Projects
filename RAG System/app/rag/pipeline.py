from app.ingestion.loader import load_documents
from app.embeddings.embedder import Embedder
from app.vectorstore.faiss_store import FAISSStore

class RAGPipeline:
    def __init__(self):
        self.embedder = Embedder()

        docs = load_documents()

        embeddings = self.embedder.embed(docs)
        dimension = embeddings.shape[1]

        self.vectorstore = FAISSStore(dimension)
        self.vectorstore.add(embeddings, docs)

    def ask(self, question):
        query_embedding = self.embedder.embed_query(question)

        results = self.vectorstore.search(query_embedding)

        context = "\n".join(results)

        answer = f"""
Based on company data:

{context}

Answer: {results[0]}
"""
        return answer