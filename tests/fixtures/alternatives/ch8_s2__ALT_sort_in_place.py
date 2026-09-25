# Lambda basics
double = lambda x: x * 2
print("double(21) =", double(21))

# Sort by length using lambda
words = ["cherry", "apple", "banana"]
words.sort()
print(words)
print(sorted(words, key=lambda word: len(word)))
