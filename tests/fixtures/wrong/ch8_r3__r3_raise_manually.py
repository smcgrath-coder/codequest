# Handle ValueError
try:
    raise ValueError("bad number")
except ValueError:
    print("That's not a number!")

# Handle ZeroDivisionError
try:
    raise ZeroDivisionError
except ZeroDivisionError:
    print("You can't divide by zero!")

# Handle KeyError
try:
    raise KeyError("b")
except KeyError:
    print("That key doesn't exist!")
