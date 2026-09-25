# Define function that RETURNS a value
def calculate_damage(base, multiplier):
    return base * multiplier

# Call it and use the result
damage = 0
damage = calculate_damage(10, 3)
print(f"Damage dealt: {damage}")
