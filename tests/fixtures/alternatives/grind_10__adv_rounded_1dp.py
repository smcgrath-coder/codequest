# Define converter functions
def celsius_to_fahrenheit(c):
    return round(c * 9 / 5 + 32, 1)

def fahrenheit_to_celsius(f):
    return round((f - 32) * 5 / 9, 1)

# Test them
print(celsius_to_fahrenheit(0))
print(fahrenheit_to_celsius(212))
