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
    new_time = total_time + run["time"]
    new_points = total_points + run["points"]
    print(f"{run['name']}: {new_points} pts in {new_time}s")
    if new_time <= MATCH_TIME:
        print("  -> added")
        total_time, total_points = new_time, new_points
    else:
        print("  -> skipped")
