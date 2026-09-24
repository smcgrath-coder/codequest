heroes = [
  {"name":"Knight","power":15,"speed":8},
  {"name":"Mage","power":20,"speed":5},
  {"name":"Rogue","power":10,"speed":18}
]

by_power = sorted(heroes, key=lambda h: h["power"], reverse=True)
by_name = sorted(heroes, key=lambda h: h["name"])
for h in by_power: print(h["name"], h["power"])
for h in by_power: print(h["name"], h["speed"])
for h in by_name: print(h["name"])
