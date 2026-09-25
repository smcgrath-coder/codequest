answers = []
for i in range(1, 21):
    if i % 15 == 0:
        answers.append("FizzBuzz")
    elif i % 3 == 0:
        answers.append("Fizz")
    elif i % 5 == 0:
        answers.append("Buzz")
    else:
        answers.append(str(i))
print(", ".join(answers))
