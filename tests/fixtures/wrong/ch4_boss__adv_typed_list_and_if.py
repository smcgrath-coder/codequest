# Countdown (skip 7)
for i in [10, 9, 8, 6, 5, 4, 3, 2, 1]:
    if i == 7:
        continue
    print(i)

# Liftoff
print("LIFTOFF!")

# Altitude
for alt in range(100, 501, 100):
    print(f"Altitude: {alt}")
