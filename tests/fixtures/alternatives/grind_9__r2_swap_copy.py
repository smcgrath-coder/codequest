original = [1, 2, 3, 4, 5]

backwards = original.copy()
for i in range(len(backwards) // 2):
    backwards[i], backwards[-1 - i] = backwards[-1 - i], backwards[i]
print(backwards)
