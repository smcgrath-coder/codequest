# Build character dictionary
character = {
    "name": "Aria",
    "char_class": "Mage",
    "stats": {"strength": 8, "speed": 12, "magic": 18},
    "inventory": ["staff", "potion", "spellbook"]
}

# Write display function
def display_character(char):
    print(f"Name: {char['name']}")
    print(f"Class: {char['char_class']}")
    print("Stats:")
    for stat, value in char["stats"].items():
        print(f"  {stat}: {value}")
    print("Inventory:")
    for item in char["inventory"]:
        print(f"  - {item}")

# Call it
display_character(character)
