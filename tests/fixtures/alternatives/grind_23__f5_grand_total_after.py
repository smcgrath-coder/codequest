runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
print("Ranking: " + ", ".join(r["name"] for r in ranked))
t = 0
p = 0
for r in ranked:
    if t + r["time"] <= MATCH_TIME:
        t += r["time"]
        p += r["points"]
print(f"Best in {MATCH_TIME}s: {p} points")
print(f"All runs together: {sum(r['points'] for r in runs)} points")
