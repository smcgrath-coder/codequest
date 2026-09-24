words = ["the", "quick", "fox", "jumps", "over", "a", "lazy", "dog"]

# Build a list of long words
long_words = []
for word in words:
    if len(word) > 3:
        long_words.append(word)
print(long_words)
print(4)
