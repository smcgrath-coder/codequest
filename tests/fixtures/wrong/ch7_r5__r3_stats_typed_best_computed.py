party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]

print("Knight 15 12")
print("Mage 20 5")
print("Rogue 12 8")
best = max(party, key=lambda m: m["attack"])
print("Highest attack:", best["name"])
