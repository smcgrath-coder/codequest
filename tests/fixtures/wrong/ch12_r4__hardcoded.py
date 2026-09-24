# Square On Line — Simulated
BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

# Phase 1: Drive until one sensor finds line
print("Driving...")
print("Driving...")
print("Driving...")
print("Line found! Left: 18, Right: 55")

# Phase 2: Wiggle until both sensors on line
print("Left: 18, Right: 55 -> turn_right")
print("Left: 18, Right: 40 -> turn_right")
print("Left: 18, Right: 25 -> turn_right")
print("Left: 15, Right: 12 -> aligned")
print("✅ Squared on line!")
print("Phase 1 ticks: 4")
print("Phase 2 ticks: 4")
