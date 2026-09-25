# Handle ValueError
try:
    int("hello")
except ValueError as e:
    print(f"⚠️ That's not a number: {e}")

# Handle ZeroDivisionError
try:
    10 / 0
except ZeroDivisionError:
    print("⚠️ No dividing by zero!")

# Handle KeyError
data = {"a": 1}
try:
    data["b"]
except KeyError:
    print("⚠️ There is no key 'b'.")
