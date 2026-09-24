# Motor Command Logger
log = []

def log_command(log, motor, action, value):
    entry = {"motor": motor, "action": action, "value": value}
    log.append(entry)

commands = [("left_motor", "straight", 400), ("right_motor", "straight", 400),
            ("left_arm", "rotate", -240), ("right_arm", "rotate", 195)]
for motor, action, value in commands:
    log_command(log, motor, action, value)

for entry in log:
    print(entry["motor"], "->", entry["action"], entry["value"])
print("Total commands:", len(log))
