runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

def efficiency(run):
    return run["points"] / run["time"]

ranked = sorted(runs, key=efficiency, reverse=True)
print("Ranking:", ", ".join(r["name"] for r in ranked))

plan = []
used = 0
for r in ranked:
    if used + r["time"] <= MATCH_TIME:
        plan.append(r["name"])
        used += r["time"]
print("Optimal order: " + " -> ".join(plan))
