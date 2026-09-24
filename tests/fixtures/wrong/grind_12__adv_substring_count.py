text = "the cat sat on the mat the cat"


counts = {}
for w in text.split():
    counts[w] = text.count(w)
for w, n in counts.items():
    print(w, n)
