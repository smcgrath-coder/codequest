total = 0
count = 0

for i in range(1, 101):
    total += i
    if i % 3 == 0:
        count += 1
    print("Sum:", total, "Count:", count)
