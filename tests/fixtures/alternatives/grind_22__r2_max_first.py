BLACK_LINE = 22
readings = [80,75,70,65,58,50,42,35,28,22,18,15,12,10,15,20,35,55,72,80]

print("Maximum:", max(readings))
print("Minimum:", min(readings))
print("Average:", sum(readings) / len(readings))
below = [r for r in readings if r < BLACK_LINE]
print("Below BLACK_LINE:", len(below))
print("Index of first black reading:", readings.index(below[0]))
