total = 0
count = 0

for i in range(1, 101):
    total = total + i
    if i % 3 == 0:
        count = count + 1

print(total)
print(count)
