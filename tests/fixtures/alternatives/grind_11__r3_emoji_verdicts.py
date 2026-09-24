def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)

print("hello", "✅" if is_strong("hello") else "❌")
print("secret42", "✅" if is_strong("secret42") else "❌")
