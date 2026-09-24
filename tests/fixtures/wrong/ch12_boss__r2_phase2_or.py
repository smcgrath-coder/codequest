# Complete Competition Program
BLACK_LINE = 22

# Speed profiles
SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_SLOW = {"straight": 150, "turn": 100}

# Helper functions
def apply_speed(profile):
    print(f"Speed set: straight={profile['straight']}, turn={profile['turn']}")

def launch():
    print("Resetting gyro...")
    print("Resetting arms...")
    print("🟡 Ready!")

def end_run():
    print("🟢 Run complete!")

def right_arm(deg, speed=600):
    print(f"Right arm: {deg}° at speed {speed}")

def left_arm(deg, speed=600):
    print(f"Left arm: {deg}° at speed {speed}")

def straight(distance):
    direction = "forward" if distance > 0 else "backward"
    print(f"Driving {abs(distance)}mm {direction}")

def turn(angle):
    direction = "right" if angle > 0 else "left"
    print(f"Turning {abs(angle)}° {direction}")

# square_on_line
def square_on_line(approach_data, align_data):
    print("Phase 1: Drive until one sensor finds the line")
    for left, right in approach_data:
        if left < BLACK_LINE or right < BLACK_LINE:
            print(f"Line found! Left: {left}, Right: {right}")
            break
        print(f"Driving... Left: {left}, Right: {right}")

    print("Phase 2: Wiggle until both sensors are on the line")
    for left, right in align_data:
        if left < BLACK_LINE or right < BLACK_LINE:
            print(f"Left: {left}, Right: {right} -> aligned")
            print("✅ Squared on line!")
            break
        elif left < BLACK_LINE:
            print(f"Left: {left}, Right: {right} -> turn_right")
        elif right < BLACK_LINE:
            print(f"Left: {left}, Right: {right} -> turn_left")
        else:
            print(f"Left: {left}, Right: {right} -> drive_forward")

# Runs
def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(500)
    turn(90)
    straight(200)
    left_arm(90)
    end_run()

def Run2():
    launch()
    apply_speed(SPEED_SLOW)
    square_on_line(approach, align)
    straight(100)
    turn(-90)
    end_run()

# Menu
buttons = ["center", "right", "center"]
current_program = 1
max_programs = 3

approach = [(80,80),(60,70),(18,50)]
align = [(18,50),(18,20),(14,12)]

for button in buttons:
    if button == "left":
        current_program -= 1
        if current_program < 1:
            current_program = max_programs
    elif button == "right":
        current_program += 1
        if current_program > max_programs:
            current_program = 1
    elif button == "center":
        if current_program == 1:
            Run1()
        elif current_program == 2:
            Run2()
        else:
            print(f"Run {current_program} not implemented")
        current_program += 1
        if current_program > max_programs:
            current_program = 1
    print(f"=== Program {current_program} ===")
