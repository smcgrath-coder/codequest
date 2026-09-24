# Handle ValueError
try:
    int("hello")
except ValueError:
    print("Error caught!")

# Handle ZeroDivisionError
try:
    10 / 0
except ZeroDivisionError:
    print("Error caught!")

# Handle KeyError
try:
    print({"a": 1}.get("b"))
except KeyError:
    print("Error caught!")
