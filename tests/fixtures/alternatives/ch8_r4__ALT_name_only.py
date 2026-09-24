data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
for line in data.split("\n"):
    name, score = line.split(",")
    records.append({"name": name, "score": int(score)})

# Print all and find highest
for record in records:
    print(record)
best = records[0]
for record in records:
    if record["score"] > best["score"]:
        best = record
print("Top scorer:", best["name"])
