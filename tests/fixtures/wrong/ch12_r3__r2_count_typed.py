BLACK_LINE = 22

readings = [(10,12), (15,60), (55,18), (70,80), (20,8), (45,50)]

def analyze_alignment(left_val, right_val):
    if left_val < BLACK_LINE and right_val < BLACK_LINE:
        return "aligned"
    elif left_val < BLACK_LINE:
        return "turn_right"
    elif right_val < BLACK_LINE:
        return "turn_left"
    else:
        return "drive_forward"

def print_action(action):
    print("Action:", action)

for l, r in readings:
    print_action(analyze_alignment(l, r))
print("Aligned readings: 2")
