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

# The two messages are the wrong way round
if enemy["hp"] <= 0:
    print("The Dragon defeated the Hero!")
else:
    print("The Hero defeated the Dragon!")
