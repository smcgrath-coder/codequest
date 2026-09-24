text = "the cat sat on the mat the cat"

counts = {}
for word in text.split():
    if word in counts:
        counts[word] += 1
    else:
        counts[word] = 1

for word, count in counts.items():
    print(f"{word}: {count}")
