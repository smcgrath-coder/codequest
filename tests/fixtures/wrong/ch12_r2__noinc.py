# Drive Until Line
BLACK_LINE = 22
sensor_readings = [80, 75, 60, 55, 40, 18, 10]

def drive_until_line(readings, threshold):
    i = 0
    while readings[i] >= threshold:
        print(f"Driving... sensor: {readings[i]} (white)")
    print(f"LINE DETECTED! sensor: {readings[i]} — Stopping!")
    return i

print(drive_until_line(sensor_readings, BLACK_LINE))
