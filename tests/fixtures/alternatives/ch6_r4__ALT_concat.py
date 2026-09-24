# Define function with default parameter
def power_up(name, amount=10):
    message = name + " gained " + str(amount) + " power!"
    return message

# Call with default and with override
first = power_up("Rogue")
second = power_up("Wizard", amount=50)
print(first)
print(second)
