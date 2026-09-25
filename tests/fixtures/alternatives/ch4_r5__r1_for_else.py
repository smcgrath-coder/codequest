for i in range(1, 21):
    if i % 2 == 0:
        continue
    print(i)
    if i % 7 == 0:
        break
else:
    print("No number divisible by 7 found")
