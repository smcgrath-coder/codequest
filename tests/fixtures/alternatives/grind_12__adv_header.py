text = "the cat sat on the mat the cat"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print("Word counts:")
for word, n in counts.items():
    print(word, n)
