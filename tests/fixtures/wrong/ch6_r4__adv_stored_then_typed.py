# Define function with default parameter
def power_up(name, amount=10):
    return f"{name} gained {amount} power!"

# Call with default and with override
first = power_up("Knight")
second = power_up("Mage", 25)
print("Knight gained 10 power!")
print("Mage gained 25 power!")
