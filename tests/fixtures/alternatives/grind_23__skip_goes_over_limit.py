runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
used = 0
print("Optimal order:")
for r in ranked:
    if used + r["time"] <= MATCH_TIME:
        used += r["time"]
        print(f"{r['name']} ({r['time']}s)")
    else:
        print(f"{r['name']} would go over {MATCH_TIME}s")
