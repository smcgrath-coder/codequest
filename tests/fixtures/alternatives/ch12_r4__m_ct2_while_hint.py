# Square On Line — Simulated
BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

# Phase 1: Drive until one sensor finds line
i = 0
left, right = approach[i]
while left >= BLACK_LINE and right >= BLACK_LINE:
    print("Driving...")
    i += 1
    left, right = approach[i]
print(f"Phase 1 done: left={left}, right={right}")

# Phase 2: Wiggle until both sensors on line
j = 0
while True:
    left, right = alignment[j]
    j += 1
    if left < BLACK_LINE and right < BLACK_LINE:
        print("Action: aligned")
        break
    elif left < BLACK_LINE:
        print("Action: turn_right")
    elif right < BLACK_LINE:
        print("Action: turn_left")
    else:
        print("Action: drive forward")

print("✅ Squared on line!")
print(f"Phase 1 took {i} ticks")
print(f"Phase 2 took {j} ticks")
