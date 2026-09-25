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
i = 0
while i < len(ranked):
    r = ranked[i]
    print(f"{r['name']}: total {total_points + r['points']}")
    if total_time + r["time"] <= MATCH_TIME:
        total_time += r["time"]
        total_points += r["points"]
        i += 1
    else:
        print("  -> skipped")
print(f"Total: {total_points}")
