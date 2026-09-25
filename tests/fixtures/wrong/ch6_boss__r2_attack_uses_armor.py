def calc_attack(strength, weapon):
    return strength * 2 + weapon

def calc_defense(armor, shield):
    return armor + shield * 1.5

def hero_report(name, strength, weapon, armor, shield):
    attack = calc_attack(strength, armor)
    defense = calc_defense(armor, shield)
    total = attack + defense
    print(f"{name}: attack {attack}, defense {defense}, total {total}")

hero_report("Brutus", 7, 2, 6, 4)
