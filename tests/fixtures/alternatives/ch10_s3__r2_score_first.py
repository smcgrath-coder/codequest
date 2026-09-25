# High Score System
scores = []

def add_score(table, name, score):
    table.append({"name": name, "score": score})
    table.sort(key=lambda e: e["score"], reverse=True)

def show_top(table, n=3):
    print("🏆 TOP SCORES 🏆")
    rank = 1
    for entry in table[:n]:
        print(f"#{rank}  {entry['score']} pts  {entry['name']}")
        rank += 1

add_score(scores, "Alice", 850)
add_score(scores, "Bob", 1200)
add_score(scores, "Carol", 650)
add_score(scores, "Dave", 950)
add_score(scores, "Eve", 1100)
show_top(scores)
