items = ["map", "torch", "key", "gem", "scroll", "ring"]
print("First 3:")
for item in items[:3]:
    print(item)
print("Last 2:")
for item in items[-2:]:
    print(item)
print("Middle:")
for item in items[2:4]:
    print(item)
print("Total:", len(items))
