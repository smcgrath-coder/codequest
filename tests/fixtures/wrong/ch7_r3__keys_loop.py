stats = {"strength": 15, "speed": 12, "magic": 8, "luck": 20}

for key in stats:
    print(f"{key}: {stats[key]}")

print(f"Total: {sum(stats.values())}")
