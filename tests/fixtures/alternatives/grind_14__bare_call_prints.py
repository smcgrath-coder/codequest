# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("You can't divide by zero!")

print(safe_divide(10, 3))
safe_divide(10, 0)
