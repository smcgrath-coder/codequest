runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150
ranked = sorted(runs, key=lambda r: r["points"] / r["time"], reverse=True)
total = 0
line = ""
for r in ranked:
    total += r["points"]
    line += f"{r['name']}({total}) "
print(line)
print("Nothing skipped:")
for r in ranked:
    print(f"  {r['name']} - {r['time']}s - didn't skip")
