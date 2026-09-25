words = ["the", "quick", "fox", "jumps", "over", "a", "lazy", "dog"]

# Build a list of long words
long_words = []
for w in words:
    if len(w) > 3:
        long_words.append(w)
print("quick, jumps, over, lazy")
print(len(long_words))
