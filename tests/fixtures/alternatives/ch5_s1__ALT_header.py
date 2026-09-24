library = ["Python", "Data", "Loops", "Lists", "Games"]

print("Searching the library...")
for book in ["Python", "Ruby", "Games", "Math"]:
    if book in library:
        print("Yes, we have", book)
    else:
        print("No", book, "here")
