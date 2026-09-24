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
done = 0
skipped = 0
for run_time in run_times:
    if can_fit_run(time_left, run_time):
        print("Run of", format_time(run_time), "fits")
        time_left -= run_time
        used += run_time
        done += 1
    else:
        print("Run of", format_time(run_time), "doesn't fit")
        skipped += 1
print("Used:", format_time(used))
print("Left:", format_time(time_left))
print("Runs completed:", done)
print("Runs skipped:", skipped)
