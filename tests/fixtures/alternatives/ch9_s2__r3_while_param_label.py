def countdown(n):
    while n >= 1:
        print(n)
        n -= 1
    print("🚀 BLAST OFF!")
    return "launched"

answer = countdown(5)
print("The rocket was", answer)
