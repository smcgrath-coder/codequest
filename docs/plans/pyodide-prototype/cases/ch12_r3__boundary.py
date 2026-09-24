# Two-Sensor Alignment Analyzer
BLACK_LINE = 22

readings = [(10,12), (15,60), (55,18), (70,80), (20,8), (45,50)]

# Functions
def analyze_alignment(left_val, right_val):
    if left_val <= BLACK_LINE and right_val <= BLACK_LINE:
        return "aligned"
    elif left_val <= BLACK_LINE:
        return "turn_right"
    elif right_val <= BLACK_LINE:
        return "turn_left"
    else:
        return "drive_forward"

def print_action(action):
    print(f"Action: {action}")

# Test all readings
aligned_count = 0
for left_val, right_val in readings:
    action = analyze_alignment(left_val, right_val)
    print_action(action)
    if action == "aligned":
        aligned_count += 1
print(f"Aligned readings: {aligned_count}")
