runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

order = ["Run1", "Run3", "Run4", "Run2"]
used = 0
pts = 0
for name in order:
    for r in runs:
        if r["name"] == name and used + r["time"] <= MATCH_TIME:
            used += r["time"]
            pts += r["points"]
            print(name)
print("Total points:", pts)
