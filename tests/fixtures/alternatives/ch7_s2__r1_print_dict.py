word = "mississippi"
counts = {}
for char in word:
    counts[char] = counts.get(char, 0) + 1
print(counts)
