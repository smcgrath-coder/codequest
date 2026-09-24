library = ["Python", "Data", "Loops", "Lists", "Games"]


for name in ["Python", "Ruby", "Games", "Math"]:
    found = False
    for book in library:
        if book == name:
            found = True
    if found == True:
        print(name + ": Found!")
    else:
        print(name + ": Not found")
