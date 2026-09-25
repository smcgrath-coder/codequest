sentence = "  the quick brown fox jumps over  "


clean = sentence.strip()
words = clean.split()
print(len(words))
print(" - ".join(words))
if clean.startswith("the"):
    print("Yes, it starts with the")
else:
    print("No, it does not start with the")
