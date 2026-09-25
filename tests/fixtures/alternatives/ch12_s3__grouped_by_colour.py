# Sensor Calibration Tool
white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

threshold = calibrate(white_samples, black_samples)
print("White avg:", average(white_samples))
print("Black avg:", average(black_samples))
print("Threshold:", threshold)

black_ones = []
white_ones = []
for reading in [20, 45, 8, 60]:
    if reading < threshold:
        black_ones.append(reading)
    else:
        white_ones.append(reading)
print("Black readings:", black_ones)
print("White readings:", white_ones)
