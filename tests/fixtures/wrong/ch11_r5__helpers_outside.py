# Mission Framework
# (Simulating the Donut Sharks Run1 structure)

# Helper functions
def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(distance):
    direction = "forward" if distance > 0 else "backward"
    print(f"Driving {abs(distance)}mm {direction}")

def turn(angle):
    direction = "right" if angle > 0 else "left"
    print(f"Turning {abs(angle)}° {direction}")

def right_arm(degrees, speed=600):
    print(f"Right arm: {degrees}° at speed {speed}")

# Run1 mission
def Run1():
    print("Speed set to fast")
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    right_arm(-240)

# Execute!
launch()
Run1()
end_run()
