words = ["the", "quick", "fox", "jumps", "over", "a", "lazy", "dog"]

# Build a list of long words
long_words = []
for word in words:
    if len(word) > 3:
        long_words.append(word)
print("Long words: " + ", ".join(long_words))
print("How many: " + str(len(long_words)))
