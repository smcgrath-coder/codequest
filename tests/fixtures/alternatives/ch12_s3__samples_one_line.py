white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

print("White:", white_samples, "Black:", black_samples)
white_avg = average(white_samples)
black_avg = average(black_samples)
threshold = calibrate(white_samples, black_samples)
print("White avg:", white_avg)
print("Black avg:", black_avg)
print("Threshold:", threshold)
for reading in [20, 45, 8, 60]:
    color = "black" if reading < threshold else "white"
    print(reading, "is", color)
