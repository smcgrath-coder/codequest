white_samples = [78, 82, 80, 79, 81]
black_samples = [12, 15, 10, 14, 11]

def average(samples):
    return sum(samples) / len(samples)

def calibrate(white, black):
    return (average(white) + average(black)) / 2

wa, ba = average(white_samples), average(black_samples)
thr = calibrate(white_samples, black_samples)
print("avg white = %.1f, avg black = %.1f, threshold = %.1f" % (wa, ba, thr))
labels = {True: "black", False: "white"}
print([(r, labels[r < thr]) for r in [20, 45, 8, 60]])
