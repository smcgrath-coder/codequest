runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
print("Optimal order:")
for i, r in enumerate(ranked, 1):
    print(f"{i}. {r['name']}")
