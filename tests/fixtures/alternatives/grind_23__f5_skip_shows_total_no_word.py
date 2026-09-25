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
missed = []
for r in order:
    if t + r["time"] <= MATCH_TIME:
        t += r["time"]
        p += r["points"]
        print(f"{r['name']} added")
    else:
        missed.append(r)
print(f"Total: {p} points, {t}s")
if missed:
    r = missed[0]
    print(f"{r['name']}: {p + r['points']} points needs {t + r['time']}s, but the match is {MATCH_TIME}s")
