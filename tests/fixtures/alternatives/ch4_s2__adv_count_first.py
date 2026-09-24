total = 0
count = 0

for i in range(1, 101):
    total += i
    if i % 3 == 0:
        count += 1
print("Divisible by 3:", count)
print("Sum:", total)
