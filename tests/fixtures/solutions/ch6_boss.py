# Function 1: calc_attack
def calc_attack(strength, weapon):
    return strength * 2 + weapon

# Function 2: calc_defense
def calc_defense(armor, shield):
    return armor + shield * 1.5

# Function 3: hero_report (calls the other two)
def hero_report(name, str, wpn, arm, shd):
    attack = calc_attack(str, wpn)
    defense = calc_defense(arm, shd)
    total = attack + defense
    print(f"Hero: {name}")
    print(f"Attack: {attack}")
    print(f"Defense: {defense}")
    print(f"Total Power: {total}")

# Call hero_report
hero_report("Knight", 10, 5, 8, 4)
