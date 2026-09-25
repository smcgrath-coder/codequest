# Create nested dictionary
world = {
    "forest": {"danger": 3, "treasure": 5},
    "cave": {"danger": 8, "treasure": 10},
    "village": {"danger": 1, "treasure": 2}
}

# Loop and display
for place, props in world.items():
    print(place)
    for k, v in props.items():
        print(f"  {k}: {v}")

# Find highest treasure
best = None
for place in world:
    if best is None or world[place]["treasure"] > world[best]["treasure"]:
        best = place
print("Most treasure:", best)
