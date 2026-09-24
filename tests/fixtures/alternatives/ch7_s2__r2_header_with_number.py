word = "mississippi"

# Count each letter
counts = {}
for letter in word:
    if letter in counts:
        counts[letter] += 1
    else:
        counts[letter] = 1

# Print results
print("mississippi has", len(word), "letters:")
for letter, n in counts.items():
    print(letter, "->", n)
