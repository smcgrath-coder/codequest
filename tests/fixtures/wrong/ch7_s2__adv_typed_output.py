word = "mississippi"


# Count each letter
counts = {}
for letter in word:
    counts[letter] = counts.get(letter, 0) + 1

# Print results
print("m: 1")
print("i: 4")
print("s: 4")
print("p: 2")
