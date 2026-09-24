# Define function that RETURNS a value
def calculate_damage(base, multiplier):
    return base * multiplier

# Call it and use the result
print("The anvil rings!")
damage = calculate_damage(10, 3)
print(f"Damage dealt: {damage}")
