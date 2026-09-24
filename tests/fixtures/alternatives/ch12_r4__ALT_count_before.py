# Square On Line — Simulated
BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

# Phase 1: Drive until one sensor finds line
ticks1 = 0
for left, right in approach:
    if left < BLACK_LINE or right < BLACK_LINE:
        break
    print("Driving...")
    ticks1 += 1

# Phase 2: Wiggle until both sensors on line
ticks2 = 0
for left, right in alignment:
    if left < BLACK_LINE and right < BLACK_LINE:
        print("Aligned")
        print("✅ Squared on line!")
        break
    if left < BLACK_LINE:
        print("Turn right")
    else:
        print("Turn left")
    ticks2 += 1

print("Phase 1 ticks:", ticks1)
print("Phase 2 ticks:", ticks2)
