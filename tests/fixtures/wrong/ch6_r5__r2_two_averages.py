scores = [85, 92, 78, 95, 88]

def analyze_scores(scores):
    return sum(scores) / len(scores), sum(scores) / len(scores)

average, highest = analyze_scores(scores)
print("Scores:", scores)
print("Average:", average)
