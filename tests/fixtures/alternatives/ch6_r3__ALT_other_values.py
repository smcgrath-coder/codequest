# Define function that RETURNS a value
def calculate_damage(base, multiplier):
    result = base * multiplier
    return result

# Call it and use the result
hit = calculate_damage(7, 2.5)
print("Damage dealt:", hit)
