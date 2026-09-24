import math
waypoints = [(0,0),(300,0),(300,400),(0,400)]

total = 0
for i in range(len(waypoints) - 1):
    x1, y1 = waypoints[i]
    x2, y2 = waypoints[i + 1]
    distance = math.sqrt((x2 - x1)^2 + (y2 - y1)^2)
    print(f"Waypoint {i} to {i + 1}: {distance} mm")
    total += distance

print(f"Total distance: {total} mm")
