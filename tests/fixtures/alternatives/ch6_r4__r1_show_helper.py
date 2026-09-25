def power_up(name, amount=10):
    return f"{name} gained {amount} power!"

def show(message):
    print(message)

show(power_up("Knight"))
show(power_up("Mage", 25))
