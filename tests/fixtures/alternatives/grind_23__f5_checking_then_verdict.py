runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
total_time = 0
total_points = 0
for run in ranked:
    print(f"Checking {run['name']}: {total_time + run['time']}s, {total_points + run['points']} pts")
    if total_time + run["time"] <= MATCH_TIME:
        total_time += run["time"]
        total_points += run["points"]
        print("  Added!")
    else:
        print("  Too long, skipped")
