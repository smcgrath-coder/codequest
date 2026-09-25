data = "Alex,85\nSam,92\nJo,78\nMax,88"
records = []
for line in data.split("\n"):
    name, score = line.split(",")
    records.append({"name": name, "score": int(score)})
names = [r["name"] for r in records]
scores = sorted(r["score"] for r in records)
for n, s in zip(names, scores):
    print(n, s)
best = max(records, key=lambda r: r["score"])
print("Highest scorer:", best["name"])
