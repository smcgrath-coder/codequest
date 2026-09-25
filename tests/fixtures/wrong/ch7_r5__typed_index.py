party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]

for member in party:
    print(f"{member['name']}: ATK={member['attack']}, DEF={member['defense']}")

print(f"Highest attack: {party[1]['name']}")
