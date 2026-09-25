# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
print("Optimal order:")
for r in ranked:
    print(r["name"])

best = ranked[:2]
total = sum(r["points"] for r in best)
print(f"Best combo: {best[0]['name']} + {best[1]['name']} = {total} points")
