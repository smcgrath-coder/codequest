log = []

def log_command(log, motor, action, value):
    log.append({"motor": motor, "action": action, "value": value})

log_command(log, "left_motor", 400, "straight")
log_command(log, "right_motor", 400, "straight")
log_command(log, "left_arm", -240, "rotate")
log_command(log, "right_arm", 195, "rotate")

for entry in log:
    print(entry["motor"], entry["action"], entry["value"])
print("Total commands:", len(log))
