def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Can't divide by zero!"

print("10 / 3 = 3.33")
print("10 / 0 = Can't divide by zero!")
