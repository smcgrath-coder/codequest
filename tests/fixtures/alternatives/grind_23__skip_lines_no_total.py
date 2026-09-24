# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)

time_left = MATCH_TIME
print("Optimal order:")
for run in ranked:
    if run["time"] <= time_left:
        time_left -= run["time"]
        print(f"✅ {run['name']} ({run['time']}s)")
    else:
        print(f"❌ {run['name']} doesn't fit")
print(f"Time left: {time_left}s")
