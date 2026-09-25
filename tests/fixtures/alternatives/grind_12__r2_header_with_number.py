text = "the cat sat on the mat the cat"

counts = {}
words = text.split()
for w in words:
    counts[w] = counts.get(w, 0) + 1
print("There are", len(words), "words in the text.")
for w, n in counts.items():
    print(w, "=", n)
