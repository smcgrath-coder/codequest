BLACK_LINE = 22
readings = [80,75,70,65,58,50,42,35,28,22,18,15,12,10,15,20,35,55,72,80]

lowest = min(readings)
highest = max(readings)
average = sum(readings) / len(readings)
print(f"Minimum: {lowest}")
print(f"Maximum: {highest}")
print(f"Average: {average}")

black_count = 0
for reading in readings:
    if reading < BLACK_LINE:
        black_count += 1
print(f"Readings below {BLACK_LINE}: {black_count}")

for i, reading in enumerate(readings):
    if reading < BLACK_LINE:
        print(f"First black reading at index {i}")
        break
