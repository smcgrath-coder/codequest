white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (white + black) / 2

white_avg = average(white_samples)
black_avg = average(black_samples)
threshold = calibrate(white_avg, black_avg)
print(f"White: {white_avg}  Black: {black_avg}  Threshold: {threshold}")

results = {}
for reading in [20, 45, 8, 60]:
    results[reading] = "black" if reading < threshold else "white"
print(results)
