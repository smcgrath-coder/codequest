# Define converter functions
def celsius_to_fahrenheit(c):
    f = c * 9/5 + 32
    print(c, "C is", f, "F")
    return f

def fahrenheit_to_celsius(f):
    c = (f - 32) * 5/9
    print(f, "F is", c, "C")
    return c

# Test them
celsius_to_fahrenheit(0)
fahrenheit_to_celsius(212)
