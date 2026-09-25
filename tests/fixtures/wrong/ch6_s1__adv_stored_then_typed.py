# Three functions that work together
def calc_attack(level):
    return level * 3

def calc_defense(level):
    return level * 2 + 5

def power_rating(level):
    return calc_attack(level) + calc_defense(level)

a = power_rating(1)
b = power_rating(5)
c = power_rating(10)
print(10)
print(30)
print(55)
