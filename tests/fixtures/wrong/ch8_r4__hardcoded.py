data = "Alex,85\nSam,92\nJo,78\nMax,88"

# Parse into list of dicts
records = [
    {"name": "Alex", "score": 85},
    {"name": "Sam", "score": 92},
    {"name": "Jo", "score": 78},
    {"name": "Max", "score": 88},
]

# Print all and find highest
for record in records:
    print(f"{record['name']}: {record['score']}")
print("Highest scorer: Sam with 92")
