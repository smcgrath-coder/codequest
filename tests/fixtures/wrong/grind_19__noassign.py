# Battle simulator
player = {"name":"Hero","hp":100,"attack":20}
enemy = {"name":"Dragon","hp":80,"attack":15}

while player["hp"] > 0 and enemy["hp"] > 0:
    print(f"Hero attacks! Dragon HP: {enemy['hp'] - player['attack']}")
    print(f"Dragon attacks! Hero HP: {player['hp'] - enemy['attack']}")
