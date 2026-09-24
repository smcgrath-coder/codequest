# Handle ValueError
try:
    int("hello")
except ValueError:
    print("Can't convert 'hello' to a number!")

# Handle ZeroDivisionError
try:
    10 / 0
except ZeroDivisionError:
    print("You can't divide by zero!")

# Handle KeyError
try:
    {"a": 1}["b"]
except KeyError:
    print("That key doesn't exist in the dictionary!")
