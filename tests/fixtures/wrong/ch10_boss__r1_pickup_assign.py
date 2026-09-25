rooms = {
    "start": {"desc": "A dark cave entrance...", "exits": {"north": "hall"}},
    "hall": {"desc": "A long hall with a sword on the wall.", "exits": {"north": "treasure", "south": "start"}},
    "treasure": {"desc": "A room full of gold!", "exits": {"south": "hall"}},
}

player = {"location": "start", "inventory": [], "hp": 50}

def look(rooms, player):
    print(rooms[player["location"]]["desc"])

def move(rooms, player, direction):
    exits = rooms[player["location"]]["exits"]
    if direction in exits:
        player["location"] = exits[direction]
        print("You go", direction)
    else:
        print("You cannot go that way.")

def pickup(player, item):
    player["inventory"] = item
    print("You picked up", item)

actions = ["look", "north", "look", "pickup sword", "north", "look"]
for action in actions:
    if action == "look":
        look(rooms, player)
    elif action.startswith("pickup"):
        pickup(player, action.split()[1])
    else:
        move(rooms, player, action)
