# Text Adventure
rooms = {
    # Define 3+ rooms with desc and exits
    "start": {"desc": "A dark cave entrance...", "exits": {"north": "hall"}},
    "hall": {"desc": "A long stone hall lit by torches. A sword leans against the wall.", "exits": {"north": "treasure", "south": "start"}},
    "treasure": {"desc": "The treasure room! Gold coins sparkle everywhere. You found the treasure!", "exits": {"south": "hall"}},
}

player = {"location": "start", "inventory": [], "hp": 50}

# look, move, pickup functions
def look(rooms, player):
    room = rooms[player["location"]]
    print(room["desc"])

def move(rooms, player, direction):
    exits = rooms[player["location"]]["exits"]
    if direction in exits:
        player["location"] = exits[direction]
        print(f"You walk {direction}.")
    else:
        print("You can't go that way!")

def pickup(player, item):
    player["inventory"].append(item)
    print(f"You picked up the {item}!")

# Simulate playthrough
actions = ["look", "north", "look", "pickup sword", "north", "look"]

for action in actions:
    print(f"> {action}")
    words = action.split()
    if words[0] == "look":
        look(rooms, player)
    elif words[0] == "pickup":
        pickup(player, words[1])
    else:
        move(rooms, player, action)
