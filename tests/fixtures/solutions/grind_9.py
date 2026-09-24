original = [1, 2, 3, 4, 5]

reversed_list = []
for i in range(len(original) - 1, -1, -1):
    reversed_list.append(original[i])

print(reversed_list)
