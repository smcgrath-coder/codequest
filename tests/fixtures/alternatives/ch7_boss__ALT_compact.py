# Build character dictionary
hero = {
    "name": "Tamsin",
    "char_class": "Ranger",
    "stats": {"strength": 11, "speed": 17, "magic": 6},
    "inventory": ["bow", "arrows", "cloak"],
}

# Write display function
def display_character(char):
    stats = char["stats"]
    print(f"{char['name']} the {char['char_class']}")
    print(f"Strength {stats['strength']}, Speed {stats['speed']}, Magic {stats['magic']}")
    print("Carrying: " + ", ".join(char["inventory"]))

# Call it
display_character(hero)
