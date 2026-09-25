# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

order = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
t = 0
p = 0
rest = []
for r in order:
    if t + r["time"] <= MATCH_TIME:
        t += r["time"]
        p += r["points"]
        print(f"Pick {r['name']}")
    else:
        rest.append(r)
print(f"Total: {p}")
for r in rest[:1]:
    print(f"{r['name']} next: {p + r['points']} pts in {t + r['time']}s - too slow")
