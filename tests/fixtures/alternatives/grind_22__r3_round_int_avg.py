BLACK_LINE = 22
readings = [80,75,70,65,58,50,42,35,28,22,18,15,12,10,15,20,35,55,72,80]

print("Min:", min(readings))
print("Max:", max(readings))
print("Average:", round(sum(readings) / len(readings)))
count = 0
for r in readings:
    if r < BLACK_LINE:
        count += 1
print("Below 22:", count)
for i in range(len(readings)):
    if readings[i] < BLACK_LINE:
        print("First black index:", i)
        break
