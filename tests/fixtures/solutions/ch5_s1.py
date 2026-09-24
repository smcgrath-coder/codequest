library = ["Python", "Data", "Loops", "Lists", "Games"]

searches = ["Python", "Ruby", "Games", "Math"]
for book in searches:
    if book in library:
        print(f"{book}: Found!")
    else:
        print(f"{book}: Not found")
