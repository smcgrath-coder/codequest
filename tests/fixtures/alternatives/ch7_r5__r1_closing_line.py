party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]
for member in party:
    print(f"{member['name']}: attack {member['attack']}, defense {member['defense']}")
best = max(party, key=lambda m: m["attack"])
print("Highest attack:", best["name"])
print("Go team!")
