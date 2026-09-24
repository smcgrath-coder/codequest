party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]

for member in party:
    print("Name:", member["name"])
    print("Attack:", member["attack"])
    print("Defense:", member["defense"])
    print()

strongest = party[0]
for member in party:
    if member["attack"] > strongest["attack"]:
        strongest = member
print("Highest attack:", strongest["name"])
