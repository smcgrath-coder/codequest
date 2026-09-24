def safe_divide(a, b):
    return a / b

print(safe_divide(10, 3))
try:
    print(safe_divide(10, 0))
except ZeroDivisionError:
    print("Error: can't divide by zero!")
