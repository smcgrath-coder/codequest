total = 0
count = 0
for i in range(1, 101):
    total += i
    if i % 3 == 0:
        count += 1
print("=== Accumulator ===")
print("Sum of 1 to 100:", total)
print("Divisible by 3:", count)
