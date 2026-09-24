# Define converter functions
def celsius_to_fahrenheit(c):
    return c * 9 / 5 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) * 5 / 9

# Test them
freezing = celsius_to_fahrenheit(0)
boiling = fahrenheit_to_celsius(212)
print("0C is", freezing, "F")
print(f"212F is {boiling}C")
