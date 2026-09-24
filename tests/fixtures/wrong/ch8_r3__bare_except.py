# Handle ValueError
try:
    int("hello")
except:
    print("Can't convert 'hello' to a number!")

# Handle ZeroDivisionError
try:
    10 / 0
except:
    print("You can't divide by zero!")

# Handle KeyError
try:
    {"a": 1}["b"]
except:
    print("That key doesn't exist in the dictionary!")
