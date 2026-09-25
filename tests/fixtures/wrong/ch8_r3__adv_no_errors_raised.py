# Handle ValueError
try:
    print(int("5"))
except ValueError:
    print("Can't convert!")

# Handle ZeroDivisionError
try:
    print(10 / 2)
except ZeroDivisionError:
    print("Can't divide by zero!")

# Handle KeyError
try:
    print({"a": 1}["a"])
except KeyError:
    print("No such key!")
