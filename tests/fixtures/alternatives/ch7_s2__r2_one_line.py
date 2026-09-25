word = "mississippi"

counts = {}
for letter in word:
    counts[letter] = counts.get(letter, 0) + 1

print(", ".join(f"{k}: {v}" for k, v in counts.items()))
