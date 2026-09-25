numbers = [12, 5, 23, 8, 17, 3, 21, 9]

filtered = []
for n in numbers:
    if n > 10:
        filtered.append(n)
print("Numbers bigger than 10:")
for n in filtered:
    print(n)
print("Count:", len(filtered))
