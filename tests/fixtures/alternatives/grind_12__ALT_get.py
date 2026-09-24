text = "the cat sat on the mat the cat"

word_counts = {}
for word in text.split():
    word_counts[word] = word_counts.get(word, 0) + 1

for word, count in word_counts.items():
    print(word, "->", count)
