# Define converter functions
def celsius_to_fahrenheit(c):
    return c * 9/5 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) * 5/9

# Test them
print("212F in Celsius:", fahrenheit_to_celsius(212))
print("0C in Fahrenheit:", celsius_to_fahrenheit(0))
