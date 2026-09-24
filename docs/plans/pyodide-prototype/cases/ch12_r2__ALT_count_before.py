# Drive Until Line
BLACK_LINE = 22
sensor_readings = [80, 75, 60, 55, 40, 18, 10]

def drive_until_line(readings, threshold):
    ticks = 0
    for val in readings:
        if val < threshold:
            print(f"LINE DETECTED! sensor: {val} - Stopping!")
            break
        print(f"Driving... sensor: {val} (white)")
        ticks += 1
    return ticks

print("Ticks:", drive_until_line(sensor_readings, BLACK_LINE))
