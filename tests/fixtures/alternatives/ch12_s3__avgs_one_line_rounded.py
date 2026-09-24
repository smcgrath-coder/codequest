white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

white_avg = average(white_samples)
black_avg = average(black_samples)
threshold = calibrate(white_samples, black_samples)
print(f"White avg: {round(white_avg)}, Black avg: {round(black_avg)}, Threshold: {round(threshold)}")
for reading in [20, 45, 8, 60]:
    if reading < threshold:
        print(f"{reading} -> black")
    else:
        print(f"{reading} -> white")
