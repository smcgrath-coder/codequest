# Motor Command Logger
log = []

def log_command(log, motor, action, value):
    log.append({"motor": motor, "action": action, "value": value})

log_command(log, "left_motor", "straight", 400)
log_command(log, "right_motor", "straight", 400)
log_command(log, "left_arm", "rotate", -240)
log_command(log, "right_arm", "rotate", 195)

for i, entry in enumerate(log):
    print(f"{i + 1}. {entry['motor']}: {entry['action']} {entry['value']}")
print(f"Total commands: {len(log)}")
