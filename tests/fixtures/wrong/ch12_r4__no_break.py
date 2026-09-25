# Square On Line — Simulated
BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

# Phase 1: Drive until one sensor finds line
phase1_ticks = 0
for left, right in approach:
    phase1_ticks += 1
    if left < BLACK_LINE or right < BLACK_LINE:
        print(f"Line found! Left: {left}, Right: {right}")
    else:
        print("Driving...")

# Phase 2: Wiggle until both sensors on line
phase2_ticks = 0
for left, right in alignment:
    phase2_ticks += 1
    if left < BLACK_LINE and right < BLACK_LINE:
        action = "aligned"
    elif left < BLACK_LINE:
        action = "turn_right"
    elif right < BLACK_LINE:
        action = "turn_left"
    else:
        action = "drive_forward"
    print(f"Left: {left}, Right: {right} -> {action}")
    if action == "aligned":
        print("✅ Squared on line!")

print(f"Phase 1 ticks: {phase1_ticks}")
print(f"Phase 2 ticks: {phase2_ticks}")
