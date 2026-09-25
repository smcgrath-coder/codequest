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
    t += r["time"]; p += r["points"]
    print(f"{r['name']}: {p} pts in {t}s")
    print("  -> added")
