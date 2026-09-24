library = ["Python", "Data", "Loops", "Lists", "Games"]

searches = ["Python", "Ruby", "Games", "Math"]
found = [b for b in searches if b in library]
missing = [b for b in searches if b not in library]
print("Found:", found)
print("Missing:", missing)
