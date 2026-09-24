print("Odd numbers from 1 to 20, until one divides by 7")
for i in range(1, 21):
    if i % 2 == 0:
        continue
    print(i)
    if i % 7 == 0:
        break
