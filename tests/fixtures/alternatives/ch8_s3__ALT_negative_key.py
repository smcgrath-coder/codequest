heroes = [
  {"name":"Knight","power":15,"speed":8},
  {"name":"Mage","power":20,"speed":5},
  {"name":"Rogue","power":10,"speed":18}
]

print("Strongest first:")
for hero in sorted(heroes, key=lambda h: -h["power"]):
    print(" ", hero["name"])
print("Slowest first:")
for hero in sorted(heroes, key=lambda h: h["speed"]):
    print(" ", hero["name"])
print("A to Z:")
for hero in sorted(heroes, key=lambda h: h["name"]):
    print(" ", hero["name"])
