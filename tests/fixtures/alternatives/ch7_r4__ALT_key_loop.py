# Create nested dictionary
world = {
    "forest": {"danger": 3, "treasure": 5},
    "cave": {"danger": 8, "treasure": 10},
    "village": {"danger": 1, "treasure": 2},
}

# Loop and display
for name in world:
    info = world[name]
    print(name, "has danger", info["danger"], "and treasure", info["treasure"])

# Find highest treasure
richest = ""
most = -1
for name in world:
    if world[name]["treasure"] > most:
        most = world[name]["treasure"]
        richest = name
print("Most treasure is in the", richest)
