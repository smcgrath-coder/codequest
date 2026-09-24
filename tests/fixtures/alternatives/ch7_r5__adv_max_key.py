party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]
for member in party:
    print(member["name"], "ATK", member["attack"], "DEF", member["defense"])
best = max(party, key=lambda m: m["attack"])
print("Highest attack:", best["name"])
