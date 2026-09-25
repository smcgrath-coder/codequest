word = "mississippi"

# Count each letter
counts = {}
for letter in word:
    counts[letter] = counts.get(letter, 0) + 1

# Print results
print(counts.items())
