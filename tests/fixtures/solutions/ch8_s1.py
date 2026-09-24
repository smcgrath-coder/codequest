items = [("Sword", 29.99), ("Shield", 15.5), ("Potion", 3.0)]

# Print formatted table
print(f"{'Item':<10} Price")
print("-" * 17)
for name, price in items:
    price_text = f"${price:.2f}"
    print(f"{name:<10} {price_text:>6}")
