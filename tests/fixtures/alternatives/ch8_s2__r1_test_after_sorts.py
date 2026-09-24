words = ["cherry", "apple", "banana"]
double = lambda x: x * 2
print(sorted(words))
print(sorted(words, key=lambda w: len(w)))
print(double(4))
