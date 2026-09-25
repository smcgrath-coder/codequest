# Build character dictionary
character = {
    "name": "Aria",
    "char_class": "Mage",
    "stats": {"strength": 8, "speed": 12, "magic": 18},
    "inventory": ["staff", "potion", "spellbook"]
}

# Write display function
def display_character(char):
    print(f"Name: {character['name']}")
    print(f"Class: {character['char_class']}")
    for stat, value in character["stats"].items():
        print(f"  {stat}: {value}")
    for item in character["inventory"]:
        print(f"  - {item}")

# Call it
display_character(character)
