from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed(self, texts):
        return self.model.encode(texts, show_progress_bar=False)

    def embed_query(self, query):
        return self.model.encode([query])[0]