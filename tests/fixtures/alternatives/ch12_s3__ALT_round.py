# Sensor Calibration Tool
white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    total = 0
    for s in samples:
        total += s
    return total / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

threshold = calibrate(white_samples, black_samples)
print("White avg:", round(average(white_samples), 1))
print("Black avg:", round(average(black_samples), 1))
print("Threshold:", round(threshold, 1))

for reading in [20, 45, 8, 60]:
    if reading < threshold:
        color = "BLACK"
    else:
        color = "WHITE"
    print("Reading", reading, "is", color)
