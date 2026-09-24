words = ["the", "quick", "fox", "jumps", "over", "a", "lazy", "dog"]

# Build a list of long words
long_words = [word for word in words if len(word) > 3]

print("Long words:", long_words)
print("How many:", len(long_words))
