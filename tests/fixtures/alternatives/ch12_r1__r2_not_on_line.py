# Sensor Simulator
BLACK_LINE = 22

def read_sensor(value):
    if value < BLACK_LINE:
        return "black"
    return "white"

def check_sensors(left_val, right_val):
    for side, val in (("Left", left_val), ("Right", right_val)):
        if read_sensor(val) == "black":
            print(f"{side} sensor ({val}): on the line")
        else:
            print(f"{side} sensor ({val}): not on the line")

readings = [(15, 60), (55, 18), (12, 10), (70, 80)]
for l, r in readings:
    check_sensors(l, r)
