# Sensor Calibration Tool
white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    white_avg = average(white)
    black_avg = average(black)
    return (white_avg + black_avg) / 2

white_avg = average(white_samples)
black_avg = average(black_samples)
threshold = calibrate(white_samples, black_samples)

print(f"White average: {white_avg}")
print(f"Black average: {black_avg}")
print(f"Recommended threshold: {threshold}")

test_readings = [20, 45, 8, 60]
for reading in test_readings:
    if reading < threshold:
        print(f"{reading} -> black")
    else:
        print(f"{reading} -> white")
