text = "the cat sat on the mat the cat"

counts = {}
for w in text.split():
    counts[w] = counts.get(w, 0) + 1
for w, n in counts.items():
    print(f"{w}: {n}")
print(f"Total words: {sum(counts.values())}")
