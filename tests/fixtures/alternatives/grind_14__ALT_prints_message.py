# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("Oops! You can't divide by zero.")
        return None

print(safe_divide(10, 3))
print(safe_divide(10, 0))
