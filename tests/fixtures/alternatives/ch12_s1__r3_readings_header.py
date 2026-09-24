gyro_angle = 0

def gyro_turn(target, readings):
    print(f"Target {target}°, readings: {readings}")
    angle = 0
    for r in readings:
        angle = r
        print(f"  gyro = {r}")
        if abs(r) >= abs(target):
            break
    return angle

gyro_angle = gyro_turn(90, [0, 15, 32, 48, 65, 78, 91, 95])
print("Final angle:", gyro_angle)
gyro_angle = gyro_turn(-45, [0, -10, -22, -38, -46, -50])
print("Final angle:", gyro_angle)
