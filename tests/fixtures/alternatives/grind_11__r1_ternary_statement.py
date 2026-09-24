def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)

for pw in ["hello", "secret42"]:
    print(pw, "is strong") if is_strong(pw) else print(pw, "is weak")
