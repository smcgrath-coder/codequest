data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
lines = data.split("\n")
for line in lines:
    parts = line.split(",")
    record = {"name": parts[0], "score": int(parts[1])}
    records.append(record)

# Print all and find highest
best = records[0]
for record in records:
    print(f"{record['name']}: {record['score']}")
    if record["score"] > best["score"]:
        best = record
print(f"Highest scorer: {best['name']} with {best['score']}")
