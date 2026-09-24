player = {"name": "Hero", "hp": 100, "attack": 20}
enemy = {"name": "Dragon", "hp": 80, "attack": 15}

while True:
    enemy["hp"] = max(0, enemy["hp"] - player["attack"])
    print(f"{player['name']} hits! {enemy['name']} loses {player['attack']} HP and has {enemy['hp']} HP")
    if enemy["hp"] == 0:
        break
    player["hp"] = max(0, player["hp"] - enemy["attack"])
    print(f"{enemy['name']} bites! {player['name']} loses {enemy['attack']} HP and has {player['hp']} HP")
    if player["hp"] == 0:
        break
print(f"Final HP - {player['name']}: {player['hp']}, {enemy['name']}: {enemy['hp']}")
if player["hp"] > 0:
    print(f"{player['name']} wins!")
else:
    print(f"{enemy['name']} wins!")
