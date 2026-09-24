# Mission Timer
MATCH_TIME = 150
run_times = [28, 35, 42, 31]

def format_time(seconds):
    minutes = seconds // 60
    secs = seconds % 60
    if secs < 10:
        return str(minutes) + ":0" + str(secs)
    return str(minutes) + ":" + str(secs)

def can_fit_run(time_left, run_time, buffer=5):
    return run_time + buffer <= time_left

time_left = MATCH_TIME
used = 0
for run_time in run_times:
    if can_fit_run(time_left, run_time):
        print("Run of", format_time(run_time), "fits")
        time_left -= run_time
        used += run_time
    else:
        print("Run of", format_time(run_time), "does not fit")
print("Time used:" + str(used))
print("Time left:" + str(time_left))
