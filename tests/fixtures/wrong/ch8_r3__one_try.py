try:
    int("hello")
    10 / 0
    {"a": 1}["b"]
except ValueError:
    print("Can't convert 'hello' to a number!")
except ZeroDivisionError:
    print("You can't divide by zero!")
except KeyError:
    print("That key doesn't exist!")
