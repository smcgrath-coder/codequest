# Build character dictionary
character = {
    "name": "Luna",
    "char_class": "Ranger",
    "stats": {"strength": 8, "speed": 15, "magic": 5},
    "inventory": ["bow", "arrows", "cloak"],
}

# Write display function
def display_character(char):
    print("=== CHARACTER ===")
    print(char)
    print("=================")

# Call it
display_character(character)
