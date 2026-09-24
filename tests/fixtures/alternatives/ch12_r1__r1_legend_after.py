BLACK_LINE = 22

def read_sensor(value):
    if value < BLACK_LINE:
        return "black"
    return "white"

def check_sensors(left_val, right_val):
    print(f"Left: {read_sensor(left_val)}, Right: {read_sensor(right_val)}")

readings = [(15, 60), (55, 18), (12, 10), (70, 80)]
for l, r in readings:
    check_sensors(l, r)
print("Remember: black means on the line!")
