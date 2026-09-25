data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
for line in data.split("\n"):
    name, score = line.split(",")
    records.append({"name": name, "score": int(score)})

# Print all and find highest
print("Alex 85")
print("Sam 92")
print("Jo 78")
print("Max 88")
best = max(records, key=lambda r: r["score"])
print("Highest:", best["name"])
