sentence = "  the quick brown fox jumps over  "
clean = sentence.strip()
words = clean.split()
print("Word count:", len(words))
print(" - ".join(words))
print("Starts with 'the'?", clean.startswith("the"))
print("All done!")
