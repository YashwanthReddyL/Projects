def load_documents():
    with open("app/data/docs.txt", "r") as f:
        text = f.read()

    # split by paragraph
    docs = [doc.strip() for doc in text.split("\n\n") if doc.strip()]
    return docs