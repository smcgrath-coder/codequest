# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

order = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
print("Running totals with every run:")
s = 0
for r in order:
    s += r["points"]
    print(f"{r['name']}: total {s}")
t = 0
p = 0
for r in order:
    if t + r["time"] <= MATCH_TIME:
        t += r["time"]
        p += r["points"]
print(f"Best in {MATCH_TIME}s: {p} points")
