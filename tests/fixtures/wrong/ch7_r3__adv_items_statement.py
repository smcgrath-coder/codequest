stats = {"strength": 15, "speed": 12, "magic": 8, "luck": 20}

stats.items()
for key in stats:
    print(f"{key}: {stats[key]}")
print("Total:", sum(stats.values()))
