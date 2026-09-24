stats = {"strength": 15, "speed": 12, "magic": 8, "luck": 20}

total = 0
for stat, amount in stats.items():
    print(stat + ": " + str(amount))
    total += amount
print("All together:", total)
