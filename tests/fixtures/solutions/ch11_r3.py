# Arm Control Functions
movements = 0

# Define arm functions
def right_arm(degrees, speed=600):
    print(f"Right arm: {degrees}° at speed {speed}")

def left_arm(degrees, speed=600):
    print(f"Left arm: {degrees}° at speed {speed}")

# Execute the mission sequence
right_arm(-240)  # grab grass
movements += 1
left_arm(110, speed=250)  # lift minecart slowly
movements += 1
left_arm(40, speed=100)  # nudge it up
movements += 1
right_arm(195, speed=800)  # drop off flag fast
movements += 1

print(f"Total arm movements: {movements}")
