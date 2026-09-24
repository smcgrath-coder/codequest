def calc_attack(strength, weapon):
    return strength * 2 + weapon

def calc_defense(armor, shield):
    return armor + shield * 1.5

def hero_report(name, strength, weapon, armor, shield):
    attack = calc_attack(strength, weapon)
    defense = calc_defense(weapon, shield)
    print("Name:", name)
    print("Attack:", attack)
    print("Defense:", defense)
    print("Total power:", attack + defense)

hero_report("Aria", 10, 5, 8, 3)
