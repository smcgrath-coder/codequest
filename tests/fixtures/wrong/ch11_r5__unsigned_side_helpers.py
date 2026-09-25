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
    print(f"Driving {distance}mm forward")

def turn_right(deg):
    print(f"Turning {deg}°")

def turn_left(deg):
    print(f"Turning {deg}°")

def right_arm(degrees, speed=600):
    print(f"Right arm: {degrees}° at speed {speed}")

# Run1 mission
def Run1():
    launch()
    straight(690)
    turn_right(45)
    straight(130)
    turn_left(90)
    straight(90)
    right_arm(-240)
    end_run()

# Execute!
Run1()
