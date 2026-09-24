words = ["hi", "hello", "hey", "howdy"]
doubles = [i * 2 for i in range(1, 6)]
long = [w for w in words if len(w) > 3]
print(long)
print(doubles)
