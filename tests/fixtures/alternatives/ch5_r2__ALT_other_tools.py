books = ["Dragon", "Arch", "Code"]

books += ["Beta"]
books.insert(0, "Alpha")
del books[books.index("Dragon")]
books = sorted(books)
for book in books:
    print(book)
