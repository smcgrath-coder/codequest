world = {
  "forest": {"danger": 3, "treasure": 5},
  "cave": {"danger": 8, "treasure": 10},
  "village": {"danger": 1, "treasure": 2}
}

print("forest: danger 3, treasure 5")
print("cave: danger 8, treasure 10")
print("village: danger 1, treasure 2")
best = max(world, key=lambda p: world[p]["treasure"])
print("Most treasure:", best)
