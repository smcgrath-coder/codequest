BLACK_LINE = 22

approach = [(80,80), (70,75), (50,60), (18,55)]
alignment = [(18,55), (18,40), (18,25), (15,12)]

def is_black(v):
    return v < BLACK_LINE

def action_for(l, r):
    if is_black(l) and is_black(r):
        return "aligned"
    return "turn_right" if is_black(l) else ("turn_left" if is_black(r) else "forward")

def phase1(data):
    for n, (l, r) in enumerate(data):
        if is_black(l) or is_black(r):
            return n
        print("Driving...")
    return len(data)

def phase2(data):
    for n, (l, r) in enumerate(data, start=1):
        act = action_for(l, r)
        print(act)
        if act == "aligned":
            return n
    return len(data)

t1 = phase1(approach)
t2 = phase2(alignment)
print("✅ Squared on line!")
print("ticks -> phase 1:", t1, "| phase 2:", t2)
