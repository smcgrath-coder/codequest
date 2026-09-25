# Speed and time calculator
segments = [
    {"dist":400,"speed":600},
    {"dist":200,"speed":150},
    {"dist":300,"speed":400}
]

total_time = 0
for i, segment in enumerate(segments):
    time = segment["speed"] / segment["dist"]
    print(f"Segment {i + 1}: {time:.2f} seconds")
    total_time += time

print(f"Total time: {total_time:.2f} seconds")
