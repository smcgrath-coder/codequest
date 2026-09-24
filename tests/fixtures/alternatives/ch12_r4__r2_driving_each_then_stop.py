BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

# Phase 1: Drive until one sensor finds line
ticks1 = 0
for left, right in approach:
    print("Driving...")
    ticks1 += 1
    if left < BLACK_LINE or right < BLACK_LINE:
        print("One sensor found the line!")
        break

# Phase 2: Wiggle until both sensors on line
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
