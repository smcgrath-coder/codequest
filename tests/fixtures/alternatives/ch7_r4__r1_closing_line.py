world = {
  "forest": {"danger": 3, "treasure": 5},
  "cave": {"danger": 8, "treasure": 10},
  "village": {"danger": 1, "treasure": 2}
}
top = ""
for place, info in world.items():
    print(place, info)
    if top == "" or info["treasure"] > world[top]["treasure"]:
        top = place
print("Highest treasure:", top)
print("Happy exploring!")
