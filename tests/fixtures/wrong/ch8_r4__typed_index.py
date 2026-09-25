data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
for line in data.split("\n"):
    parts = line.split(",")
    records.append({"name": parts[0], "score": int(parts[1])})

# Print all and find highest
for record in records:
    print(f"{record['name']}: {record['score']}")
print(f"Highest scorer: {records[1]['name']}")
