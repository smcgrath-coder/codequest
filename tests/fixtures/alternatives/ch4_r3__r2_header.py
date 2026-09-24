word = "python"
print("Checking the letters in", word)
for char in word:
    if char in "aeiou":
        print(char, "is a vowel")
    else:
        print(char, "is a consonant")
