sentence = "  the quick brown fox jumps over  "

clean = sentence.strip()
print(clean)

words = clean.split()
print(words)

print(len(words))

joined = " - ".join(words)
print(joined)

print(clean.startswith("the"))
