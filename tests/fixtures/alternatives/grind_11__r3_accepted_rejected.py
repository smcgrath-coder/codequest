def is_strong(password):
    return len(password) >= 8 and any(ch.isdigit() for ch in password)

for pw in ["hello", "secret42"]:
    if is_strong(pw):
        print(pw, "-> accepted")
    else:
        print(pw, "-> rejected")
