data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = []
for line in data.split("\n"):
    name, score = line.split(",")
    records.append({"name": name, "score": int(score)})

# Print all and find highest
ranked = sorted(records, key=lambda r: r["score"], reverse=True)
for place, r in enumerate(ranked, 1):
    print(f"{place}. {r['name']} - {r['score']}")
print("Highest scorer:", ranked[0]["name"])
