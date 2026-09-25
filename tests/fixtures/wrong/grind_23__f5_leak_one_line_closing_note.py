runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
total = 0
parts = []
for r in ranked:
    total += r["points"]
    parts.append(f"{r['name']}({total})")
print("Plan: " + " ".join(parts))
print("Don't forget to charge the robot!")
