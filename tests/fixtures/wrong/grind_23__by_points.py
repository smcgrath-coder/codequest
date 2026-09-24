# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

sorted_runs = sorted(runs, key=lambda r: r["points"], reverse=True)

total_time = 0
total_points = 0
print("Optimal order:")
for run in sorted_runs:
    if total_time + run["time"] <= MATCH_TIME:
        total_time += run["time"]
        total_points += run["points"]
        print(f"{run['name']}: {run['points']} points in {run['time']}s")

print(f"Total: {total_points} points in {total_time}s")
