scores = [85, 42, 91, 67, 73, 55]

for i in range(len(scores)):
    result = "Pass" if scores[i] >= 70 else "Fail"
    print("Score", scores[i], "-", result)
