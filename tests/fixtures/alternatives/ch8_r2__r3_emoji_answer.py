sentence = "  the quick brown fox jumps over  "

clean = sentence.strip()
words = clean.split()
print("Word count:", len(words))
print("Joined:", " - ".join(words))
if clean.startswith("the"):
    print("Starts with 'the'? ✅")
else:
    print("Starts with 'the'? ❌")
