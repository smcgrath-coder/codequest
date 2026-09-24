world = {
    "forest": {"danger": 3, "treasure": 5},
    "cave": {"danger": 8, "treasure": 10},
    "village": {"danger": 1, "treasure": 2}
}

for place, info in world.items():
    print(f"{place}: danger={info['danger']}, treasure={info['treasure']}")

print(f"Highest treasure: {max(world)}")
