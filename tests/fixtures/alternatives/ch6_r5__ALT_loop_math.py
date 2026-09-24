scores = [85, 92, 78, 95, 88]

# Define function that returns two values
def analyze_scores(scores):
    total = 0
    best = scores[0]
    for s in scores:
        total += s
        if s > best:
            best = s
    return total / len(scores), best

# Call and unpack
average, top = analyze_scores(scores)
print(f"The average is {average} and the top score is {top}")
