# Unit converter for robotics

def cm_to_mm(cm):
    return cm * 10

def inches_to_mm(inches):
    return round(inches * 25.4)

# Convert the values
conversions = [
    ("55 cm", cm_to_mm(55)),
    ("14 cm", cm_to_mm(14)),
    ("3.5 cm", cm_to_mm(3.5)),
    ("6 inches", inches_to_mm(6)),
]

# Print the table
print(f"{'Value':<10}{'mm':>8}")
print("-" * 18)
for value, mm in conversions:
    print(f"{value:<10}{mm:>8}")
