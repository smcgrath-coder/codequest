word = "mississippi"
counts = {}
for ch in word:
    counts[ch] = counts.get(ch, 0) + 1
print({'m': 1, 'i': 4, 's': 4, 'p': 2})
