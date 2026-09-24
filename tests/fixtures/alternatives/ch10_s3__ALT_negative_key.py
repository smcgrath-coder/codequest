# High Score System
scores = []

# add_score and show_top functions
def add_score(table, name, score):
    table.append({"name": name, "score": score})
    table.sort(key=lambda entry: -entry["score"])

def show_top(table, n=3):
    print("=== TOP SCORES ===")
    rank = 1
    for entry in table[:n]:
        print(f"#{rank} {entry['name']}: {entry['score']} points")
        rank += 1

# Add scores and show leaderboard
for name, score in [("Alice", 850), ("Bob", 1200), ("Carol", 650), ("Dave", 950), ("Eve", 1100)]:
    add_score(scores, name, score)
show_top(scores)
