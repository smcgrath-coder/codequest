runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
print("Order: " + " -> ".join(r["name"] for r in ranked))
used = 0
pts = 0
for r in ranked:
    if used + r["time"] <= MATCH_TIME:
        used += r["time"]
        pts += r["points"]
print(f"Points: {pts}")
print(f"Out of {sum(r['points'] for r in runs)} possible")
