total = 0
count = 0

for i in range(1, 101):
    total += i
    if i % 3 == 0:
        count += i

print(f"Sum: {total}")
print(f"Divisible by 3: {count}")
