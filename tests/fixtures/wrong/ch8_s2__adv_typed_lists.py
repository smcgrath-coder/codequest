# Lambda basics
double = lambda x: x * 2
print(double(5))

# Sort by length using lambda
words = ["cherry", "apple", "banana"]
sorted(words, key=lambda w: len(w))
print(["apple", "banana", "cherry"])
print(["apple", "cherry", "banana"])
