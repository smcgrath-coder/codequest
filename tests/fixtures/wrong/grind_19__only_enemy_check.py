# Battle simulator
player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

while enemy["hp"] > 0:
    enemy["hp"] -= player["attack"]
    print(f"{player['name']} attacks {enemy['name']} for {player['attack']} damage! {enemy['name']} HP: {enemy['hp']}")
    if enemy["hp"] <= 0:
        break
    player["hp"] -= enemy["attack"]
    print(f"{enemy['name']} attacks {player['name']} for {enemy['attack']} damage! {player['name']} HP: {player['hp']}")

if enemy["hp"] <= 0:
    print(f"{enemy['name']} is defeated! {player['name']} wins!")
else:
    print(f"{player['name']} is defeated! {enemy['name']} wins!")
