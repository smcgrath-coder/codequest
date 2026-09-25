# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None

first = safe_divide(10, 3)
second = safe_divide(10, 0)
print("10 / 3 = 3.33")
print("10 / 0 = None")
