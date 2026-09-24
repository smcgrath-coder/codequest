def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Can't divide by zero!"
for a, b in [(10, 3), (10, 0)]:
    print(f"{a} / {b} =", safe_divide(a, b))
