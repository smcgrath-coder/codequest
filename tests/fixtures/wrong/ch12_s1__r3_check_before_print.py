def gyro_turn(target, readings):
    angle = 0
    for r in readings:
        if (target > 0 and r >= target) or (target < 0 and r <= target):
            angle = r
            break
        angle = r
        print("Gyro:", r)
    return angle

print("Final:", gyro_turn(90, [0, 15, 32, 48, 65, 78, 91, 95]))
print("Final:", gyro_turn(-45, [0, -10, -22, -38, -46, -50]))
