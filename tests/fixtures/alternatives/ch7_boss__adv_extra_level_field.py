# Build character dictionary
character = {
    "name": "Aria",
    "char_class": "Mage",
    "level": 7,
    "stats": {"strength": 5, "speed": 8, "magic": 15},
    "inventory": ["staff", "potion", "map"],
}

# Write display function
def display_character(char):
    print(f"{char['name']} the {char['char_class']} (Level {char['level']})")
    for stat, value in char["stats"].items():
        print(f"  {stat}: {value}")
    print("Inventory:")
    for item in char["inventory"]:
        print(f"  - {item}")

# Call it
display_character(character)
