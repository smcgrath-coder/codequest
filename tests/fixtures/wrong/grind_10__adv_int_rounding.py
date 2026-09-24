# Define converter functions
def celsius_to_fahrenheit(c):
    return int(c * 9 / 5 + 32)

def fahrenheit_to_celsius(f):
    return int((f - 32) * 5 / 9)

# Test them
print(celsius_to_fahrenheit(0))
print(fahrenheit_to_celsius(212))
