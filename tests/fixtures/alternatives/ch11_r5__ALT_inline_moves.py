# Mission Framework
# (Simulating the Donut Sharks Run1 structure)

# Helper functions
def launch():
    print("Gyro reset to 0")
    print("Arms reset")
    print("Ready!")

def end_run():
    print("Run complete!")

# Run1 mission
def Run1():
    launch()
    print("Fast speed: drive forward 690 mm")
    print("Turn right 45 degrees")
    print("Drive forward 130 mm")
    print("Turn left 90 degrees")
    print("Drive forward 90 mm")
    print("Right arm grabs: -240 degrees")
    end_run()

# Execute!
Run1()
