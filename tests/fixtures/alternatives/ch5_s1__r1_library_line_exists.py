library = ["Python", "Data", "Loops", "Lists", "Games"]
print("Library:", library)
for book in ["Python", "Ruby", "Games", "Math"]:
    if book in library:
        print(book, "exists")
    else:
        print(book, "does not exist")
