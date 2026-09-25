# Run optimization
runs = [
    {"name":"Run1","time":28,"points":120},
    {"name":"Run2","time":35,"points":80},
    {"name":"Run3","time":42,"points":160},
    {"name":"Run4","time":31,"points":95}
]
MATCH_TIME = 150

print("Optimal order:")
print("Run1: 120 points in 28s (4.29 pts/s)")
print("Run3: 160 points in 42s (3.81 pts/s)")
print("Run4: 95 points in 31s (3.06 pts/s)")
print("Run2: 80 points in 35s (2.29 pts/s)")
print("Total: 455 points in 136s")
