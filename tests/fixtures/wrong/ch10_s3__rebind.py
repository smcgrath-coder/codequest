# High Score System
scores = []

# add_score and show_top functions
def add_score(table, name, score):
    table.append({"name": name, "score": score})
    table = sorted(table, key=lambda x: x["score"], reverse=True)

def show_top(table, n=3):
    print("🏆 LEADERBOARD 🏆")
    for i, entry in enumerate(table[:n]):
        print(f"{i + 1}. {entry['name']} - {entry['score']}")

# Add scores and show leaderboard
add_score(scores, "Alice", 850)
add_score(scores, "Bob", 1200)
add_score(scores, "Carol", 650)
add_score(scores, "Dave", 950)
add_score(scores, "Eve", 1100)
show_top(scores)
