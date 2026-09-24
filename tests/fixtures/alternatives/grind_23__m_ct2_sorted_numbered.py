# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

def ratio(run):
    return run["points"] / run["time"]

best = sorted(runs, key=ratio, reverse=True)

time_used = 0
chosen = []
for run in best:
    if time_used + run["time"] <= MATCH_TIME:
        chosen.append(run)
        time_used += run["time"]

print("🏆 Best run order:")
place = 1
for run in chosen:
    print(f"{place}. {run['name']} ({ratio(run):.2f} points per second)")
    place += 1
print(f"Time used: {time_used}s of {MATCH_TIME}s")
