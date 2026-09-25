# Safe division function
def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return 0

print(safe_divide(10, 3))
print(safe_divide(10, 0))
