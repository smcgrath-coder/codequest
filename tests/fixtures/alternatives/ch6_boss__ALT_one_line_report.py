# Function 1: calc_attack
def calc_attack(strength, weapon):
    return strength * 2 + weapon

# Function 2: calc_defense
def calc_defense(armor, shield):
    return armor + shield * 1.5

# Function 3: hero_report (calls the other two)
def hero_report(name, strength, weapon, armor, shield):
    attack = calc_attack(strength, weapon)
    defense = calc_defense(armor, shield)
    print(f"{name} | Attack: {attack} | Defense: {defense} | Total power: {attack + defense}")

# Call hero_report
hero_report("Valkyrie", 12, 6, 7, 3)
