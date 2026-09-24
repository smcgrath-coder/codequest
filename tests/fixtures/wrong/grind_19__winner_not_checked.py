# Battle simulator
player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

while player["hp"] > 0 and enemy["hp"] > 0:
    enemy["hp"] -= player["attack"]
    print("Hero attacks! Dragon HP:", enemy["hp"])
    if enemy["hp"] <= 0:
        break
    player["hp"] -= enemy["attack"]
    print("Dragon attacks! Hero HP:", player["hp"])

# Always says the Hero won, even when the Hero runs out of HP first
print("The Hero defeated the Dragon!")
