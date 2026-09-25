BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

phase1_ticks = 0
for left, right in approach:
    phase1_ticks += 1
    if left <= BLACK_LINE or right <= BLACK_LINE:
        break
    print("Driving...")

phase2_ticks = 0
for left, right in alignment:
    phase2_ticks += 1
    if left <= BLACK_LINE and right <= BLACK_LINE:
        print("aligned")
        print("✅ Squared on line!")
        break
    elif left <= BLACK_LINE:
        print("turn_right")
    else:
        print("turn_left")
print("Phase 1 ticks:", phase1_ticks)
print("Phase 2 ticks:", phase2_ticks)
