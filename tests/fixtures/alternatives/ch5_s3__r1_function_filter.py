def long_words(words):
    return [w for w in words if len(w) > 3]
doubles = [i * 2 for i in range(1, 6)]
long = long_words(["hi", "hello", "hey", "howdy"])
print(doubles)
print(long)
