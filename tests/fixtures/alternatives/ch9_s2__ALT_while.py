# Countdown function
def countdown(n):
    while n >= 1:
        print(n)
        n -= 1
    print("BLAST OFF!")
    return "launched"

print(countdown(5))
