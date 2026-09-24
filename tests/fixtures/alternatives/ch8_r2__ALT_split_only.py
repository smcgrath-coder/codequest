sentence = "  the quick brown fox jumps over  "

words = sentence.split()
print("Words:", words)
print("Word count:", len(words))
print("Joined:", " - ".join(words))
print("Starts with 'the':", sentence.strip().startswith("the"))
