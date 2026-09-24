original = [1, 2, 3, 4, 5]

backwards = [original[i] for i in range(len(original) - 1, -1, -1)]
print(backwards)
