# Safe division function
def safe_divide(a, b):
    if b != 0:
        return a / b
    return "Error: can't divide by zero!"

print(safe_divide(10, 3))
print(safe_divide(10, 0))
