words = ["the", "quick", "fox", "jumps", "over", "a", "lazy", "dog"]

# Build a list of long words
long_words = []

for w in words:
    if len(w) <= 3:
        words.remove(w)
long_words = words
print(long_words)
print(len(long_words))
