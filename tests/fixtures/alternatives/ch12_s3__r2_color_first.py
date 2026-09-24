# Sensor Calibration Tool
white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

threshold = calibrate(white_samples, black_samples)
print("White average:", average(white_samples))
print("Black average:", average(black_samples))
print("Threshold:", threshold)

for reading in [20, 45, 8, 60]:
    if reading < threshold:
        color = "black"
    else:
        color = "white"
    print(f"{color}: {reading}")
