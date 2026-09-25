scores = [85, 42, 91, 67, 73, 55]
print("Passing score is 70 or more")
for score in scores:
    if score >= 70:
        print(f"{score}: Pass")
    else:
        print(f"{score}: Fail")
