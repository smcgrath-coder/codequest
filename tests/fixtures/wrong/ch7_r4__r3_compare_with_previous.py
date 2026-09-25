world = {
  "forest": {"danger": 3, "treasure": 5},
  "cave": {"danger": 8, "treasure": 10},
  "village": {"danger": 1, "treasure": 2}
}

places = list(world)
for p in places:
    print(p, "danger:", world[p]["danger"], "treasure:", world[p]["treasure"])

best = places[0]
for i in range(1, len(places)):
    if world[places[i]]["treasure"] > world[places[i - 1]]["treasure"]:
        best = places[i]
print("Most treasure:", best)
