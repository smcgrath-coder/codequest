# Password strength checker
def is_strong(password):
    return len(password) >= 8 and any(c.isdigit() for c in password)

results = {}
for p in ["hello", "secret42"]:
    results[p] = is_strong(p)
for p, strong in results.items():
    print(p, strong)
