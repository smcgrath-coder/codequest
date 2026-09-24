original = [1, 2, 3, 4, 5]

def reverse(lst):
    new = []
    for x in lst:
        new.insert(0, x)
    return new

print(reverse(original))
