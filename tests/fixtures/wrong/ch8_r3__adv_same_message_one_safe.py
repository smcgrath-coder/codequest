# Handle ValueError
try:
    int("5")
    print("Converted!")
except ValueError:
    print("Oops, error!")

# Handle ZeroDivisionError
try:
    10 / 0
except ZeroDivisionError:
    print("Oops, error!")

# Handle KeyError
try:
    {"a": 1}["b"]
except KeyError:
    print("Oops, error!")
