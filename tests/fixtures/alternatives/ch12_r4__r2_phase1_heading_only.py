# Square On Line — Simulated
BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

print("Phase 1: driving until one sensor sees the line")
ticks1 = 0
for left, right in approach:
    ticks1 += 1
    if left < BLACK_LINE or right < BLACK_LINE:
        break
    print("Driving...")

print("Phase 2: wiggling")
ticks2 = 0
for left, right in alignment:
    ticks2 += 1
    if left < BLACK_LINE and right < BLACK_LINE:
        print("aligned")
        print("✅ Squared on line!")
        break
    elif left < BLACK_LINE:
        print("turn_right")
    else:
        print("turn_left")

print("Phase 1 ticks:", ticks1)
print("Phase 2 ticks:", ticks2)
