# Handle ValueError
print("Test 1: turning hello into a number")
try:
    int("hello")
except ValueError:
    print("  Oops! 'hello' is not a number.")

# Handle ZeroDivisionError
print("Test 2: dividing 10 by 0")
try:
    10 / 0
except ZeroDivisionError:
    print("  Oops! You can't divide by zero.")

# Handle KeyError
print("Test 3: looking up key b")
try:
    {"a": 1}["b"]
except KeyError:
    print("  Oops! That key isn't in the dictionary.")
