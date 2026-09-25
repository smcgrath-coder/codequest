# Two-Sensor Alignment Analyzer
BLACK_LINE = 22

readings = [(10,12), (15,60), (55,18), (70,80), (20,8), (45,50)]

# Functions

# Test all readings
print("Left: 10, Right: 12")
print("✅ Aligned! Both sensors are on the line.")
print("Left: 15, Right: 60")
print("↪️ Turn right! Only the left sensor sees the line.")
print("Left: 55, Right: 18")
print("↩️ Turn left! Only the right sensor sees the line.")
print("Left: 70, Right: 80")
print("⬆️ Drive forward! Neither sensor sees the line.")
print("Left: 20, Right: 8")
print("✅ Aligned! Both sensors are on the line.")
print("Left: 45, Right: 50")
print("⬆️ Drive forward! Neither sensor sees the line.")
print("Aligned readings: 2")
