# Two-Sensor Alignment Analyzer
BLACK_LINE = 22

readings = [(10,12), (15,60), (55,18), (70,80), (20,8), (45,50)]

# Functions
def analyze_alignment(left_val, right_val):
    left_on = left_val < BLACK_LINE
    right_on = right_val < BLACK_LINE
    if left_on:
        if right_on:
            return "aligned"
        return "turn_right"
    if right_on:
        return "turn_left"
    return "drive_forward"

def print_action(action):
    messages = {
        "aligned": "Both sensors on the line - aligned!",
        "turn_right": "Left sensor on the line - turn right",
        "turn_left": "Right sensor on the line - turn left",
        "drive_forward": "No line yet - drive forward",
    }
    print(messages[action])

# Test all readings
count = 0
for pair in readings:
    action = analyze_alignment(pair[0], pair[1])
    print_action(action)
    if action == "aligned":
        count += 1
print("Aligned:", count)
