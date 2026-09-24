# Speed Profile System

# Define profiles
SPEED_NORMAL = {"straight": 400, "turn": 250}
SPEED_FAST = {"straight": 600, "turn": 350}
SPEED_SLOW = {"straight": 150, "turn": 100}
SPEED_PUSHING = {"straight": 250, "turn": 150}

# Functions
def apply_speed(profile):
    print(f"Speed set: straight={profile['straight']}, turn={profile['turn']}")

def drive_segment(distance, turn, profile):
    apply_speed(profile)
    print(f"Driving {distance}mm")
    print(f"Turning {turn}°")

# Execute mission segments
drive_segment(500, 0, SPEED_FAST)
drive_segment(0, 45, SPEED_NORMAL)
drive_segment(110, 0, SPEED_PUSHING)
drive_segment(0, -90, SPEED_SLOW)
