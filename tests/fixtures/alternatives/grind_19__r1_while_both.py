player = {"name": "Hero", "hp": 100, "attack": 20}
enemy = {"name": "Dragon", "hp": 80, "attack": 15}

turn = 1
while player["hp"] > 0 and enemy["hp"] > 0:
    if turn % 2 == 1:
        enemy["hp"] -= player["attack"]
        print("Hero attacks! Dragon HP:", enemy["hp"])
    else:
        player["hp"] -= enemy["attack"]
        print("Dragon attacks! Hero HP:", player["hp"])
    turn += 1
