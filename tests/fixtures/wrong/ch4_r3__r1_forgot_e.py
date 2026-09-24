word = "python"
for char in word:
    if char in "aiou":
        print(f"{char} - vowel")
    else:
        print(f"{char} - consonant")
