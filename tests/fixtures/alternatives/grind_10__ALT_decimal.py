# Define converter functions
def celsius_to_fahrenheit(c):
    return c * 1.8 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) / 1.8

# Test them
print("0 C is", celsius_to_fahrenheit(0), "F")
print("212 F is", fahrenheit_to_celsius(212), "C")
