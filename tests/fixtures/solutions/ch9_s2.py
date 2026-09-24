# Countdown function

def countdown(n):
    for i in range(n, 0, -1):
        print(i)
    print("🚀 BLAST OFF!")
    return "launched"

result = countdown(5)
print(result)
