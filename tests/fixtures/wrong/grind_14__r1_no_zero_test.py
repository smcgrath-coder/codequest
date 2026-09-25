def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Can't divide by zero!"
print(safe_divide(10, 3))
print(safe_divide(10, 2))
