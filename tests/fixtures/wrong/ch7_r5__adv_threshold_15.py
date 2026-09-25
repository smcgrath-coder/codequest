party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]
for member in party:
    print(f"{member['name']}: ATK={member['attack']} DEF={member['defense']}")
strongest = ""
for member in party:
    if member["attack"] > 15:
        strongest = member["name"]
print("Strongest:", strongest)
