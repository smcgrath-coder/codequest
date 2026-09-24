items = [("Sword", 29.99), ("Shield", 15.5), ("Potion", 3.0)]


# Print formatted table
print(f"{'Item':<10} {'Price':>7}")
print("-" * 17)
for name, price in items:
    print(f"{name:<10} ${price:>6.2f}")
