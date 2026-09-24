items = [("Sword", 29.99), ("Shield", 15.5), ("Potion", 3.0)]

# Print formatted table
print("Item".ljust(10), "Price")
print("-----------------")
for name, price in items:
    print(name.ljust(10), ("$" + format(price, ".2f")).rjust(6))
