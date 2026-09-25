# Battle simulator
player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

while True:
    enemy["hp"] = enemy["hp"] - player["attack"]
    print("Hero hits the Dragon! Dragon HP:", enemy["hp"])
    if enemy["hp"] <= 0:
        print("The Dragon has been defeated!")
        break
    player["hp"] = player["hp"] - enemy["attack"]
    print("Dragon hits the Hero! Hero HP:", player["hp"])
    if player["hp"] <= 0:
        print("The Hero has been defeated!")
        break
