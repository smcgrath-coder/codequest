word = "python"
print("Vowels: a, e, i, o, u")
for char in word:
    if char in "aeiou":
        print(char, "is a vowel")
    else:
        print(char, "is a consonant")
