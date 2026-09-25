runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
t = 0
p = 0
for r in ranked:
    print(f"{r['name']}: {p + r['points']} points, {t + r['time']}s")
    if t + r["time"] <= MATCH_TIME:
        t += r["time"]
        p += r["points"]
    else:
        print(f"{r['name']} doesn't fit")
