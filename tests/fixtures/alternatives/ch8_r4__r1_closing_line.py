data = "Alex,85\nSam,92\nJo,78\nMax,88"
records = []
for line in data.split("\n"):
    parts = line.split(",")
    records.append({"name": parts[0], "score": int(parts[1])})
for r in records:
    print(r["name"], "scored", r["score"])
best = max(records, key=lambda r: r["score"])
print("Highest scorer:", best["name"])
print("Well done everyone!")
