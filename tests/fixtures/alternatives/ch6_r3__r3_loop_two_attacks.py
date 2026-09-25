# Define function that RETURNS a value
def calculate_damage(base, multiplier):
    return base * multiplier

# Call it and use the result
for base in [10, 20]:
    damage = calculate_damage(base, 2)
    print(f"Damage dealt: {damage}")
