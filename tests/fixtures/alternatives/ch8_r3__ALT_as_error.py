# Handle ValueError
try:
    number = int("hello")
except ValueError as error:
    print("Oops, that's not a number:", error)

# Handle ZeroDivisionError
try:
    answer = 10 / 0
except ZeroDivisionError:
    print("Dividing by zero is not allowed!")

# Handle KeyError
try:
    value = {"a": 1}["b"]
except KeyError as error:
    print("Missing key:", error)
