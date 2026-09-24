movements = 0

def right_arm(degrees, speed=600):
    print(f"Right arm: {degrees}° at speed {speed}")

def left_arm(degrees, speed=250):
    print(f"Left arm: {degrees}° at speed {speed}")

right_arm(-240)
movements += 1
left_arm(110)
movements += 1
left_arm(40, speed=100)
movements += 1
right_arm(195, speed=800)
movements += 1
print(f"Total arm movements: {movements}")
