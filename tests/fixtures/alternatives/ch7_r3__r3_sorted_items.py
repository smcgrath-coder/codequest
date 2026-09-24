stats = {"strength": 15, "speed": 12, "magic": 8, "luck": 20}

total = 0
for key, value in sorted(stats.items()):
    print(f"{key}: {value}")
    total += value
print("Total:", total)
