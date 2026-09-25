text = "the cat sat on the mat the cat"

words = text.split()
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1
print("Counting the", len(words), "words:")
for w, n in counts.items():
    print(f"{w}: {n}")
