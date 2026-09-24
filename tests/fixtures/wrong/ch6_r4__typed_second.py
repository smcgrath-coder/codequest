# Define function with default parameter
def power_up(name, amount=10):
    return f"{name} gained {amount} power!"

# Call with default and with override
print(power_up("Knight"))
print("Mage gained 25 power!")
