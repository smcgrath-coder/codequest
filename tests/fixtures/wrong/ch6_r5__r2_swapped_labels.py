scores = [85, 92, 78, 95, 88]

def analyze_scores(scores):
    return max(scores), sum(scores) / len(scores)

average, highest = analyze_scores(scores)
print("Average:", average)
print("Highest:", highest)
