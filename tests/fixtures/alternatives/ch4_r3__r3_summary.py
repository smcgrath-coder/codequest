word = "python"
vowel_count = 0
for char in word:
    if char in "aeiou":
        print(char, "is a vowel")
        vowel_count += 1
    else:
        print(char, "is a consonant")
print("Total vowels:", vowel_count)
