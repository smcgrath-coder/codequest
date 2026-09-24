word = "mississippi"

# Count each letter
counts = {}
for char in word:
    counts[char] = counts.get(char, 0) + 1

# Print results
print("Letter counts for", word)
for char, n in counts.items():
    print(char, n)
