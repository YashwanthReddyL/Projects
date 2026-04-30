from app.rag.pipeline import RAGPipeline

def main():
    rag = RAGPipeline()

    print("\n💬 RAG System Ready (type 'exit' to quit)\n")

    while True:
        query = input("Ask: ")

        if query.lower() in ["exit", "quit"]:
            break

        response = rag.ask(query)
        print("\n" + response + "\n")

if __name__ == "__main__":
    main()