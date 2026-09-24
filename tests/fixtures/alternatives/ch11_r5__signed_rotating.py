# Mission Framework
# (Simulating the Donut Sharks Run1 structure)

# Helper functions
def launch():
    print("Gyro reset to 0")
    print("Arms reset")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def straight(mm):
    print(f"Straight {mm} mm")

def turn(degrees):
    print(f"Rotating {degrees} degrees")

# Run1 mission
def Run1():
    launch()
    print("Speed: fast")
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    print("Right arm grab: -240")
    end_run()

# Execute!
Run1()
