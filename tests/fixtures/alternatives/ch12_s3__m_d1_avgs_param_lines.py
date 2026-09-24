white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (white + black) / 2

wa = average(white_samples)
ba = average(black_samples)
thr = calibrate(wa, ba)
print("White avg:", wa)
print("Black avg:", ba)
print("Threshold:", thr)
for r in [20, 45, 8, 60]:
    print(r, "black" if r < thr else "white")
