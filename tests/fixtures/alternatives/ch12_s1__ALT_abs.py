# Gyro Turn Simulator
gyro_angle = 0

def gyro_turn(target, readings):
    i = 0
    angle = readings[0]
    print("Reading:", angle)
    while abs(angle) < abs(target) and i < len(readings) - 1:
        i += 1
        angle = readings[i]
        print("Reading:", angle)
    return angle

gyro_angle = gyro_turn(90, [0, 15, 32, 48, 65, 78, 91, 95])
print("Final angle:", gyro_angle)
gyro_angle = gyro_turn(-45, [0, -10, -22, -38, -46, -50])
print("Final angle:", gyro_angle)
