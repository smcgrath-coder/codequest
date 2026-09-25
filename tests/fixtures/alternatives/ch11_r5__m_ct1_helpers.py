# Mission Framework
# (Simulating the Donut Sharks Run1 structure)

# Helper functions
def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def drive(distance):
    print(f"Driving {distance}mm")

def turn(angle):
    print(f"Turning {angle}°")

def right_arm(degrees):
    print(f"Right arm: {degrees}°")

# Run1 mission
def Run1():
    launch()
    drive(690)   # fast
    turn(45)
    drive(130)
    turn(-90)
    drive(90)
    right_arm(-240)
    end_run()

# Execute!
Run1()
