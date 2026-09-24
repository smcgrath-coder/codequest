def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("Oops! You can't divide by zero.")
        return None
print("=== Safe divide tests ===")
print(safe_divide(10, 0))
print(round(safe_divide(10, 3), 2))
