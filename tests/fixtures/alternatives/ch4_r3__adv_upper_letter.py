word = "python"

for char in word:
    if char in "aeiou":
        print(f"{char.upper()} is a vowel")
    else:
        print(f"{char.upper()} is a consonant")
