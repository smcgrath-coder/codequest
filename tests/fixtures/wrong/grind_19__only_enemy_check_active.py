# Battle simulator
player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

# Only watches the Dragon's HP, so the Hero can never lose
while enemy["hp"] > 0:
    enemy["hp"] -= player["attack"]
    print("Hero attacks! Dragon HP:", enemy["hp"])
    if enemy["hp"] <= 0:
        break
    player["hp"] -= enemy["attack"]
    print("Dragon attacks! Hero HP:", player["hp"])

print("The Hero defeated the Dragon!")
