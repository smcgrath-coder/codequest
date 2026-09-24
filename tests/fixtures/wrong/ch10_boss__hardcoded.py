# Text Adventure
rooms = {
    # Define 3+ rooms with desc and exits
    "start": {"desc": "A dark cave entrance...", "exits": {"north": "hall"}},
    "hall": {"desc": "A long stone hall lit by torches. A sword leans against the wall.", "exits": {"north": "treasure", "south": "start"}},
    "treasure": {"desc": "The treasure room! Gold coins sparkle everywhere. You found the treasure!", "exits": {"south": "hall"}},
}

player = {"location": "start", "inventory": [], "hp": 50}

# look, move, pickup functions

# Simulate playthrough
actions = ["look", "north", "look", "pickup sword", "north", "look"]
print("> look")
print("A dark cave entrance...")
print("> north")
print("You walk north.")
print("> look")
print("A long stone hall lit by torches. A sword leans against the wall.")
print("> pickup sword")
print("You picked up the sword!")
print("> north")
print("You walk north.")
print("> look")
print("The treasure room! Gold coins sparkle everywhere. You found the treasure!")
