word = "mississippi"

# Count each letter
letter_counts = {}
for letter in word:
    if letter in letter_counts:
        letter_counts[letter] += 1
    else:
        letter_counts[letter] = 1

# Print results
for letter in letter_counts:
    print("The letter", letter, "appears", letter_counts[letter], "times")
