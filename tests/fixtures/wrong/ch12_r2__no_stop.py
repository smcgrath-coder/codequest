# Drive Until Line
BLACK_LINE = 22
sensor_readings = [80, 75, 60, 55, 40, 18, 10]

def drive_until_line(readings, threshold):
    ticks = 0
    for val in readings:
        ticks += 1
        if val < threshold:
            print(f"LINE DETECTED! sensor: {val} — Stopping!")
        else:
            print(f"Driving... sensor: {val} (white)")
    return ticks

ticks = drive_until_line(sensor_readings, BLACK_LINE)
print(f"It took {ticks} ticks to find the line.")
