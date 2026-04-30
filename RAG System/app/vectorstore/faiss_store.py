import faiss
import numpy as np

class FAISSStore:
    def __init__(self, dimension):
        self.index = faiss.IndexFlatL2(dimension)
        self.docs = []

    def add(self, embeddings, documents):
        self.index.add(np.array(embeddings))
        self.docs.extend(documents)

    def search(self, query_embedding, k=3):
        distances, indices = self.index.search(
            np.array([query_embedding]), k
        )

        results = [self.docs[i] for i in indices[0]]
        return results