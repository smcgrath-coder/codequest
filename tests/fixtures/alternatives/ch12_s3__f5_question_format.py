white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

white_avg = average(white_samples)
black_avg = average(black_samples)
threshold = calibrate(white_samples, black_samples)
print(f"White avg: {white_avg}")
print(f"Black avg: {black_avg}")
print(f"Threshold: {threshold}")
readings = [20, 45, 8, 60]
for r in readings:
    print(f"Is {r} white? {'yes' if r >= threshold else 'no, black'}")
