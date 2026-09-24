# Create a character dictionary
character = {"name": "Brakka", "class": "Barbarian", "level": 12, "health": 150}

# Print each value
for key in ["name", "class", "level", "health"]:
    print(key.title() + ":", character[key])
