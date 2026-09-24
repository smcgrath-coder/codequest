stats = {"strength": 15, "speed": 12, "magic": 8, "luck": 20}
for key, value in stats.items():
    print(f"{key.capitalize()}: {value}")
print("Total:", sum(stats.values()))
