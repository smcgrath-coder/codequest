original = [1, 2, 3, 4, 5]

backwards = []
for n in original:
    backwards = [n] + backwards
print(backwards)
