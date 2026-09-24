name = "Aria"
level = 5
health = 100.0

attack = level * 3.5
defense = level * (2 + 10)

print(f"Hero: {name}")
print(f"Level: {level}")
print(f"Health: {health}")
print(f"Attack: {attack}")
print(f"Defense: {defense}")
print(f"Power Rating: {attack + defense}")
