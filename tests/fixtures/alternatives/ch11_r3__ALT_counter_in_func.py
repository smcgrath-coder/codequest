# Arm Control Functions
movements = 0

# Define arm functions
def right_arm(degrees, speed=600):
    global movements
    movements += 1
    print("Right arm: " + str(degrees) + " degrees at speed " + str(speed))

def left_arm(degrees, speed=600):
    global movements
    movements += 1
    print("Left arm: " + str(degrees) + " degrees at speed " + str(speed))

# Execute the mission sequence
right_arm(-240)
left_arm(110, speed=250)
left_arm(40, speed=100)
right_arm(195, speed=800)
print("Movements:", movements)
