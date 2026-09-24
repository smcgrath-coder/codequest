stats = {"strength": 15, "speed": 12, "magic": 8, "luck": 20}

for key, value in stats.items():
    print(f"{key}: {value}")
total = 0
for value in stats.values():
    total += value
    print("Total:", total)
