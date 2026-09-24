scores = []

def add_score(table, name, score):
    table.append({"name": name, "score": score})
    table.sort(key=lambda x: x["score"], reverse=True)

def show_top(table, n=5):
    for entry in table[:n]:
        print(entry["name"], entry["score"])

add_score(scores, "Alice", 850)
add_score(scores, "Bob", 1200)
add_score(scores, "Carol", 650)
add_score(scores, "Dave", 950)
add_score(scores, "Eve", 1100)
show_top(scores, 3)
