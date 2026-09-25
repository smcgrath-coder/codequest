player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

while player["hp"] > 0 and enemy["hp"] > 0:
    enemy["hp"] -= player["attack"]
    print(f"Hero attacks Dragon for 20! Dragon HP: {enemy['hp']}")
    if enemy["hp"] <= 0:
        break
    player["hp"] -= enemy["attack"]
    print(f"Dragon attacks Hero for 15! Hero HP: {player['hp']}")
