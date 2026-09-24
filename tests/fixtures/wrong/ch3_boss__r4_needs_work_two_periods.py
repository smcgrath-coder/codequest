score = 87

if score >= 90:
    grade = "A"
    message = "Excellent!"
elif score >= 80:
    grade = "B"
    message = "Great job!"
elif score >= 70:
    grade = "C"
    message = "Not bad!"
elif score >= 60:
    grade = "D"
    message = "Needs work.."
else:
    grade = "F"
    message = "Try harder!"

print("Grade:", grade)
print(message)
