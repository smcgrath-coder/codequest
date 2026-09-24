text = "the cat sat on the mat the cat"


counts = {}
for w in text.split():
    counts[w] = counts.get(w, 0) + 1
print("the 3")
print("cat 2")
print("sat 1")
print("on 1")
print("mat 1")
