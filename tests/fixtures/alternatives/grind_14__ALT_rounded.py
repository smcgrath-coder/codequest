# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "You can't divide by zero"

print("10 / 3 =", round(safe_divide(10, 3), 2))
print("10 / 0 =", safe_divide(10, 0))
