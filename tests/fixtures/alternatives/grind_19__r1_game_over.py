player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

rnd = 1
while True:
    print("--- Round", rnd, "---")
    enemy["hp"] = enemy["hp"] - player["attack"]
    print(player["name"], "hits", enemy["name"], "for", player["attack"], "->", enemy["name"], "HP:", enemy["hp"])
    if enemy["hp"] <= 0:
        print("Victory! The Hero wins!")
        break
    player["hp"] = player["hp"] - enemy["attack"]
    print(enemy["name"], "hits", player["name"], "for", enemy["attack"], "->", player["name"], "HP:", player["hp"])
    if player["hp"] <= 0:
        print("Oh no! The Dragon wins!")
        break
    rnd += 1
print("GAME OVER")
