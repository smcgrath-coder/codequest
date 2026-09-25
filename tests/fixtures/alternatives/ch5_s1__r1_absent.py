library = ["Python", "Data", "Loops", "Lists", "Games"]
checks = ["Python", "Ruby", "Games", "Math"]
for c in checks:
    if c in library:
        print(c, "- here")
    else:
        print(c, "- absent")
