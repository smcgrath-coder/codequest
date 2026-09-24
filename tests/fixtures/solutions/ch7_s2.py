word = "mississippi"

# Count each letter
counts = {}
for char in word:
    counts[char] = counts.get(char, 0) + 1

# Print results
for letter, count in counts.items():
    print(f"{letter}: {count}")
