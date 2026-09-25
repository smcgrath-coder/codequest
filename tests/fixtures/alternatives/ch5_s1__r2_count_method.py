library = ["Python", "Data", "Loops", "Lists", "Games"]

for book in ["Python", "Ruby", "Games", "Math"]:
    if library.count(book) > 0:
        print(book, "exists")
    else:
        print(book, "does not exist")
