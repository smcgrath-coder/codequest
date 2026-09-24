import math
from math import sqrt
waypoints = [(0,0),(300,0),(300,400),(0,400)]

total = 0
for start, end in zip(waypoints, waypoints[1:]):
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    d = sqrt(dx * dx + dy * dy)
    total = total + d
    print(f"{start} -> {end}: {d:.0f} mm")
print(f"Total: {total:.0f} mm")
