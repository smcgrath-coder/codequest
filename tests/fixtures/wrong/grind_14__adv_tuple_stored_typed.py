# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None

x, y = safe_divide(10, 3), safe_divide(10, 0)
print("10 / 3 = 3.3333333333333335")
print("10 / 0 = None")
