# Sensor Simulator
BLACK_LINE = 22

# Functions
def read_sensor(value):
    if value < BLACK_LINE:
        return "black"
    else:
        return "white"

def check_sensors(left_val, right_val):
    left = read_sensor(left_val)
    right = read_sensor(right_val)
    print(f"Left sensor: {left_val} ({left}) | Right sensor: {right_val} ({right})")

# Test with sample readings
readings = [(15, 60), (55, 18), (12, 10), (70, 80)]

for left_val, right_val in readings:
    check_sensors(left_val, right_val)
