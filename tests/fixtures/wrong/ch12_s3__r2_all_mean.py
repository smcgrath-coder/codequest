white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return average(white + black)

w = average(white_samples)
b = average(black_samples)
t = calibrate(white_samples, black_samples)
print("White average:", w)
print("Black average:", b)
print("Threshold:", t)
for r in [20, 45, 8, 60]:
    print(r, "black" if r < t else "white")
