# Battle simulator
player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

turn = 1
while player["hp"] > 0 and enemy["hp"] > 0:
    if turn % 2 == 1:
        enemy["hp"] = max(0, enemy["hp"] - player["attack"])
        print(f"Turn {turn}: Hero attacks! Dragon has {enemy['hp']} HP left")
    else:
        player["hp"] = max(0, player["hp"] - enemy["attack"])
        print(f"Turn {turn}: Dragon breathes fire! Hero has {player['hp']} HP left")
    turn += 1

if enemy["hp"] == 0:
    print("The Hero defeated the Dragon!")
else:
    print("The Dragon defeated the Hero!")
