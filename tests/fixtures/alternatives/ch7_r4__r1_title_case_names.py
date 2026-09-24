world = {
  "forest": {"danger": 3, "treasure": 5},
  "cave": {"danger": 8, "treasure": 10},
  "village": {"danger": 1, "treasure": 2}
}
best_place = None
best_treasure = -1
for place, info in world.items():
    print(f"{place.title()}: danger {info['danger']}, treasure {info['treasure']}")
    if info["treasure"] > best_treasure:
        best_treasure = info["treasure"]
        best_place = place
print(f"Most treasure: {best_place.title()}")
