for i in range(1, 21):
    if i % 2 == 0:
        continue
    print(i, end=", ")
    if i % 7 == 0:
        break
