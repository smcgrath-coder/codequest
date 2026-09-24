BLACK_LINE = 22
readings = [80,75,70,65,58,50,42,35,28,22,18,15,12,10,15,20,35,55,72,80]

smallest = readings[0]
largest = readings[0]
total = 0
for r in readings:
    if r < smallest:
        smallest = r
    if r > largest:
        largest = r
    total += r
print("Min:", smallest)
print("Max:", largest)
print("Average:", round(total / len(readings), 1))

count = 0
first = -1
for i in range(len(readings)):
    if readings[i] < BLACK_LINE:
        count += 1
        if first == -1:
            first = i
print("Black readings:", count)
print("First black at index", first)
