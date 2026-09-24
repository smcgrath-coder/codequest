# Password strength checker
def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)

for word in ["hello", "secret42"]:
    answer = is_strong(word)
    if answer:
        print(word, "is strong")
    else:
        print(word, "is weak")
