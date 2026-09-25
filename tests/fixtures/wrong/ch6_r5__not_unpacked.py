scores = [85, 92, 78, 95, 88]

# Define function that returns two values
def analyze_scores(scores):
    return sum(scores) / len(scores), max(scores)

# Call and unpack
result = analyze_scores(scores)
print(result)
