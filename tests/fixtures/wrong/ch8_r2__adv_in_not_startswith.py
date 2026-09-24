sentence = "  the quick brown fox jumps over  "
clean = sentence.strip()
words = clean.split()
print(len(words))
print(" - ".join(words))
print("the" in clean)
