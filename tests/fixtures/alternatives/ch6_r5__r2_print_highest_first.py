scores = [85, 92, 78, 95, 88]

# Define function that returns two values
def analyze_scores(scores):
    average = sum(scores) / len(scores)
    highest = max(scores)
    return average, highest

# Call and unpack
average, highest = analyze_scores(scores)
print("Highest score:", highest)
print("Average score:", average)
