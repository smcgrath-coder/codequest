party = [
  {"name": "Knight", "attack": 15, "defense": 12},
  {"name": "Mage", "attack": 20, "defense": 5},
  {"name": "Rogue", "attack": 12, "defense": 8}
]

for member in party:
    print(member["name"], "- attack", member["attack"], "defense", member["defense"])

best_index = 0
for i in range(len(party)):
    if party[i]["attack"] > party[best_index]["attack"]:
        best_index = i
print("The strongest attacker is", party[best_index]["name"])
