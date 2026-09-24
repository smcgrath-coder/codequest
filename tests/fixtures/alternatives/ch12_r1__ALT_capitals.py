# Sensor Simulator
BLACK_LINE = 22

# Functions
def read_sensor(value):
    if value < BLACK_LINE:
        return "black"
    else:
        return "white"

def check_sensors(left_val, right_val):
    print(f"Left: {read_sensor(left_val).upper()}   Right: {read_sensor(right_val).upper()}")

# Test with sample readings
readings = [(15, 60), (55, 18), (12, 10), (70, 80)]
for pair in readings:
    check_sensors(pair[0], pair[1])
