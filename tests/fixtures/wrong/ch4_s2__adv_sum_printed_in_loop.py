total = 0
count = 0

for i in range(1, 101):
    total += i
    print("Sum:", total)
    if i % 3 == 0:
        count += 1
print("Count:", count)
