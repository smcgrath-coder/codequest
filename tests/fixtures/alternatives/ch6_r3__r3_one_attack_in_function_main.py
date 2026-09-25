def calculate_damage(base, multiplier):
    return base * multiplier

def attack():
    result = calculate_damage(10, 3)
    print(f"Damage dealt: {result}")

attack()
