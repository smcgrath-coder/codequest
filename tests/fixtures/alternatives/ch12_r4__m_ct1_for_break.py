# Square On Line — Simulated
BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

# Phase 1: Drive until one sensor finds line
phase1_ticks = 0
for left, right in approach:
    if left < BLACK_LINE or right < BLACK_LINE:
        print("One sensor found the line!")
        break
    print("Driving...")
    phase1_ticks += 1

# Phase 2: Wiggle until both sensors on line
phase2_ticks = 0
for left, right in alignment:
    phase2_ticks += 1
    if left < BLACK_LINE and right < BLACK_LINE:
        print("aligned")
        break
    elif left < BLACK_LINE:
        print("turn_right")
    elif right < BLACK_LINE:
        print("turn_left")

print("✅ Squared on line!")
print("Phase 1 ticks:", phase1_ticks)
print("Phase 2 ticks:", phase2_ticks)
