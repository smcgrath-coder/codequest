# Create nested dictionary
world = {
    "forest": {"danger": 3, "treasure": 5},
    "cave": {"danger": 8, "treasure": 10},
    "village": {"danger": 1, "treasure": 2}
}

# Loop and display
for place, info in world.items():
    print(f"{place}: danger={info['danger']}, treasure={info['treasure']}")

# Find highest treasure
best_place = ""
best = 0
for place, info in world.items():
    if info["danger"] > best:
        best = info["danger"]
        best_place = place
print(f"Highest treasure: {best_place}")
