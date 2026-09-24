# Gyro Turn Simulator
def gyro_turn(target, readings):
    i = 0
    angle = readings[0]
    while angle < target:
        angle = readings[i]
        print(f"Gyro: {angle}")
        i += 1
    return angle

print(gyro_turn(90, [0, 15, 32, 48, 65, 78, 91, 95]))
print(gyro_turn(-45, [0, -10, -22, -38, -46, -50]))
