# Sensor Simulator
BLACK_LINE = 22

# Functions
def read_sensor(value):
    if value < BLACK_LINE:
        return "black"
    return "white"

def check_sensors(left_val, right_val):
    print("Left is " + read_sensor(left_val) + ", right is " + read_sensor(right_val))

# Test with sample readings
readings = [(15, 60), (55, 18), (12, 10), (70, 80)]
check_sensors(15, 60)
check_sensors(55, 18)
check_sensors(12, 10)
check_sensors(70, 80)
