heroes = [
  {"name":"Knight","power":15,"speed":8},
  {"name":"Mage","power":20,"speed":5},
  {"name":"Rogue","power":10,"speed":18}
]

by_power = sorted(heroes, key=lambda h: h["power"], reverse=True)
by_speed = sorted(heroes, key=lambda h: h["speed"])
by_name = sorted(heroes, key=lambda h: h["name"])

print("By power (highest first):")
for hero in by_power:
    print(f"{hero['name']}: {hero['power']}")

print("By speed (slowest first):")
for hero in by_speed:
    print(f"{hero['name']}: {hero['speed']}")

print("By name (A to Z):")
for hero in by_name:
    print(hero["name"])
