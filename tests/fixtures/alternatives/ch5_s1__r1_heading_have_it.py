library = ["Python", "Data", "Loops", "Lists", "Games"]
print("Looking for Python, Ruby, Games and Math...")
for book in ["Python", "Ruby", "Games", "Math"]:
    if book in library:
        print(f"{book}: we have it")
    else:
        print(f"{book}: we don't have it")
