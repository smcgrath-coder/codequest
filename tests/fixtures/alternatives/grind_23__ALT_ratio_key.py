# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

for run in runs:
    run["ratio"] = run["points"] / run["time"]

best = sorted(runs, key=lambda run: run["ratio"], reverse=True)

time_used = 0
points = 0
chosen = []
for run in best:
    if time_used + run["time"] <= MATCH_TIME:
        chosen.append(run["name"])
        time_used += run["time"]
        points += run["points"]

print("Best order:", ", ".join(chosen))
print("Points:", points)
print("Time used:", time_used, "of", MATCH_TIME)
