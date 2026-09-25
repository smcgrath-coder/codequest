try:
    int("hello")
    print("Converting worked!")
except ValueError:
    pass
try:
    10 / 0
    print("Dividing worked!")
except ZeroDivisionError:
    pass
try:
    {"a": 1}["b"]
    print("Found the key!")
except KeyError:
    pass
print("All done")
print("Bye")
print("See you")
