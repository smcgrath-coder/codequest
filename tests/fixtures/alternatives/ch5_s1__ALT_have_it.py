library = ["Python", "Data", "Loops", "Lists", "Games"]

searches = ["Python", "Ruby", "Games", "Math"]
for book in searches:
    if book in library:
        print(f"{book}: we have it")
    else:
        print(f"{book}: we don't have it")
