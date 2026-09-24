word = "python"
print("Finding the vowels in", word)
for char in word:
    if char in "aeiou":
        print(char, "is a vowel")
    else:
        print(char, "is a consonant")
