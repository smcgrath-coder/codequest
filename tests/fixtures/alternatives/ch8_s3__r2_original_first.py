heroes = [
  {"name":"Knight","power":15,"speed":8},
  {"name":"Mage","power":20,"speed":5},
  {"name":"Rogue","power":10,"speed":18}
]

print("Before sorting:", [h["name"] for h in heroes])
print("By power:", [h["name"] for h in sorted(heroes, key=lambda h: h["power"], reverse=True)])
print("By speed:", [h["name"] for h in sorted(heroes, key=lambda h: h["speed"])])
print("By name:", [h["name"] for h in sorted(heroes, key=lambda h: h["name"])])
