# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Error: can't divide by zero"

print("Testing safe_divide:")
print("10 / 3 =", safe_divide(10, 3))
print("10 / 0 =", safe_divide(10, 0))
