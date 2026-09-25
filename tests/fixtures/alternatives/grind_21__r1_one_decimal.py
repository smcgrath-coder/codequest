# Speed and time calculator
segments = [
    {"dist":400,"speed":600},
    {"dist":200,"speed":150},
    {"dist":300,"speed":400}
]

total = 0
for n, seg in enumerate(segments, 1):
    t = seg["dist"] / seg["speed"]
    total = total + t
    print(f"Segment {n}: {seg['dist']}mm at {seg['speed']}mm/s = {round(t, 1)} s")
print(f"Total time: {round(total, 1)} s")
