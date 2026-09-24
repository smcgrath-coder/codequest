items = [("Sword", 29.99), ("Shield", 15.5), ("Potion", 3.0)]

# Print formatted table
print("Welcome to the shop!")
print(f"{'Item':<10} Price")
print("-" * 17)
for name, price in items:
    print(f"{name:<10} {'$' + format(price, '.2f'):>6}")
