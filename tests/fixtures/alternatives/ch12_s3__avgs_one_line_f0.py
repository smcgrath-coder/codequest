white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

wa = average(white_samples)
ba = average(black_samples)
t = calibrate(white_samples, black_samples)

print(f"Averages: white {wa:.0f}, black {ba:.0f}")
print(f"Threshold: {t}")
for r in [20, 45, 8, 60]:
    if r < t:
        print(r, "-> black")
    else:
        print(r, "-> white")
