# Define function with default parameter
def power_up(name, amount=10):
    print(f"{name} gained {amount} power!")

# Call with default and with override
power_up("Knight")
power_up("Mage", 25)
