scores = [85, 42, 91, 67, 73, 55]
passed = 0
for score in scores:
    if score >= 70:
        print(f"{score}: Pass")
        passed += 1
    else:
        print(f"{score}: Fail")
print(f"{passed} students passed!")
