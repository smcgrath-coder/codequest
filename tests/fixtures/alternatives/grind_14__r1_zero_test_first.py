# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Oops! You can't divide by zero."

print("10 / 0 =", safe_divide(10, 0))
print("10 / 3 =", safe_divide(10, 3))
