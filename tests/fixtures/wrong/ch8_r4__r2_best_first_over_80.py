data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
for line in data.split("\n"):
    parts = line.split(",")
    records.append({"name": parts[0], "score": int(parts[1])})

# Print all and find highest
for r in records:
    print(r)
top = records[0]
for r in records:
    if r["score"] > top["score"] and r["score"] > 90:
        top = r
print("Top:", top["name"])
