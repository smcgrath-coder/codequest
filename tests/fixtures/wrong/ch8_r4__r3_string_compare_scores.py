data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
for line in data.split("\n"):
    name, score = line.split(",")
    records.append({"name": name, "score": int(score)})

# Print all and find highest
for r in records:
    print(r)
best = max(records, key=lambda r: str(r["score"]))
print("Best:", best["name"])
