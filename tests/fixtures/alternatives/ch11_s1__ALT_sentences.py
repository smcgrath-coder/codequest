# Unit converter for robotics

def cm_to_mm(cm):
    return cm * 10

def inches_to_mm(inches):
    return round(inches * 25.4)

print("Conversion table")
print("55 cm =", cm_to_mm(55), "mm")
print("14 cm =", cm_to_mm(14), "mm")
print("3.5 cm =", cm_to_mm(3.5), "mm")
print("6 in =", inches_to_mm(6), "mm")
