text = "the cat sat on the mat the cat"

words = text.split()
seen = []
for word in words:
    if word not in seen:
        seen.append(word)
        print(f"{word}: {words.count(word)}")
