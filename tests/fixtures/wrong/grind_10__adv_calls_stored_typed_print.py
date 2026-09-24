# Define converter functions
def celsius_to_fahrenheit(c):
    return c * 9 / 5 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) * 5 / 9

# Test them
a = celsius_to_fahrenheit(0)
b = fahrenheit_to_celsius(212)
print("0C is 32.0F")
print("212F is 100.0C")
