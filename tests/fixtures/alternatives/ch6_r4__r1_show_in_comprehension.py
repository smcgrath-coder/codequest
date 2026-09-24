def power_up(name, amount=10):
    return f"{name} gained {amount} power!"

def show(message):
    print(message)

[show(m) for m in [power_up("Knight"), power_up("Mage", 25)]]
