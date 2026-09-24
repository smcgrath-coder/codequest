character = {
    "name": "Aria",
    "char_class": "Mage",
    "stats": {"strength": 5, "speed": 8, "magic": 15},
    "inventory": ["staff", "potion", "map"]
}

def display_character(char):
    print("=== " + char["name"].upper() + " THE " + char["char_class"].upper() + " ===")
    for stat, value in char["stats"].items():
        print(f"  {stat.title()}: {value}")
    print("  Inventory:")
    for item in char["inventory"]:
        print("   - " + item)

display_character(character)
