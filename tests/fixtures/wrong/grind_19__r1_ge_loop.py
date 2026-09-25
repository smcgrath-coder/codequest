player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

while player["hp"] >= 0 and enemy["hp"] >= 0:
    enemy["hp"] -= player["attack"]
    print(f"Hero attacks! Dragon HP: {enemy['hp']}")
    player["hp"] -= enemy["attack"]
    print(f"Dragon attacks! Hero HP: {player['hp']}")

if enemy["hp"] <= 0:
    print("The Dragon is defeated! Hero wins!")
else:
    print("The Hero is defeated! Dragon wins!")
