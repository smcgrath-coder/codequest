white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

wa = average(white_samples)
ba = average(black_samples)
th = calibrate(white_samples, black_samples)
print(f"White average: {wa}")
print(f"Black average: {ba}")
print(f"Threshold: {th}")
readings = [20, 45, 8, 60]
bl = [r for r in readings if r < th]
wh = [r for r in readings if r >= th]
print(f'Are these white? {wh} and these are black: {bl}')
