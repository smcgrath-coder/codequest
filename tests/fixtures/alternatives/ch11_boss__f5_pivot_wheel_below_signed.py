SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_NORMAL = {"straight": 400, "turn": 250}

def apply_speed(profile):
    print("⚙️ speed:", profile["straight"], profile["turn"])

def launch():
    print("🚀 go")

def end_run():
    print("🏁 finished")

def right_arm(degrees, speed=600):
    print("🦾 RIGHT ARM", degrees, speed)

def left_arm(degrees, speed=600):
    print("🦾 LEFT ARM", degrees, speed)

def straight(distance):
    print("🚗", abs(distance), "mm", "FORWARD" if distance > 0 else "BACKWARD")

def turn(angle):
    print("🔄 TURN", angle, "°")
    print("   (left wheel drives)" if angle > 0 else "   (right wheel drives)")

def Run1():
    launch()
    apply_speed(SPEED_FAST)
    straight(690)
    turn(45)
    straight(130)
    turn(-90)
    straight(90)
    right_arm(-240)
    apply_speed(SPEED_NORMAL)
    straight(-350)
    end_run()

Run1()
