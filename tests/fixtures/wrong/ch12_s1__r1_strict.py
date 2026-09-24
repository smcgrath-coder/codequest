gyro_angle = 0

def gyro_turn(target, readings):
    angle = 0
    for reading in readings:
        angle = reading
        print("Gyro:", angle)
        if target > 0 and angle > target:
            break
        if target < 0 and angle < target:
            break
    return angle

gyro_angle = gyro_turn(90, [0, 15, 32, 48, 65, 78, 91, 95])
print("Final angle:", gyro_angle)
gyro_angle = gyro_turn(-45, [0, -10, -22, -38, -46, -50])
print("Final angle:", gyro_angle)
