BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

t1 = 0
for left, right in approach:
    t1 += 1
    if left < BLACK_LINE or right < BLACK_LINE:
        break
    print("Driving...")

t2 = 0
for left, right in alignment:
    t2 += 1
    if left < BLACK_LINE and right < BLACK_LINE:
        print("aligned")
        break
    elif left < BLACK_LINE:
        print("turn_right")
    else:
        print("turn_left")
print("✅ Squared on line!")
print("Phase 1:", t1)
print("Phase 2:", t2)
