# Speed and time calculator
segments = [
    {"dist":400,"speed":600},
    {"dist":200,"speed":150},
    {"dist":300,"speed":400}
]

total = 0
number = 1
for seg in segments:
    t = seg["dist"] / seg["speed"]
    total += t
    print("Segment", number, "takes", round(t, 2), "s")
    number += 1
print("Total:", round(total, 2), "s")
