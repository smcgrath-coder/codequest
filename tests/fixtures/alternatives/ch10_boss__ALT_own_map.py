# Text Adventure
rooms = {
    "start": {"desc": "You are at the mouth of a mossy cave.", "exits": {"north": "corridor"}},
    "corridor": {"desc": "A narrow corridor. Something shiny lies on the floor.", "exits": {"north": "vault", "south": "start"}},
    "vault": {"desc": "A glittering vault full of treasure!", "exits": {"south": "corridor"}},
}

player = {"location": "start", "inventory": [], "hp": 50}

# look, move, pickup functions
def look(rooms, player):
    print(rooms[player["location"]]["desc"])

def move(rooms, player, direction):
    here = rooms[player["location"]]
    if direction in here["exits"]:
        player["location"] = here["exits"][direction]
        print("You go " + direction + ".")
    else:
        print("You can't go " + direction + " from here.")

def pickup(player, item):
    player["inventory"].append(item)
    print("Got the " + item + ".")

# Simulate playthrough
actions = ["look", "north", "look", "pickup sword", "north", "look"]
for action in actions:
    if action == "look":
        look(rooms, player)
    elif action.startswith("pickup "):
        pickup(player, action[7:])
    else:
        move(rooms, player, action)
print("Inventory:", player["inventory"])
