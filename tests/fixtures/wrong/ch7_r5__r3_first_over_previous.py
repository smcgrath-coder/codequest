party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]

for m in party:
    print(m["name"], m["attack"], m["defense"])

best = party[0]
for i in range(1, len(party)):
    if party[i]["attack"] > party[i - 1]["attack"]:
        best = party[i]
print("Highest attack:", best["name"])
