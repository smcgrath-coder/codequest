try:
    int("hello")
except ValueError:
    pass
print("Oops, that's not a number!")

try:
    10 / 0
except ZeroDivisionError:
    pass
print("You can't divide by zero!")

try:
    {"a": 1}["b"]
except KeyError:
    pass
print("That key doesn't exist!")
