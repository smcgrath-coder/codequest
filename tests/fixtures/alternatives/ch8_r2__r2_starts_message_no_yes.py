sentence = "  the quick brown fox jumps over  "

clean = sentence.strip()
words = clean.split()
print("Number of words:", len(words))
print(" - ".join(words))
if clean.startswith("the"):
    print("It starts with 'the'!")
else:
    print("It doesn't start with 'the'.")
