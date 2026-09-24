try:
    int("hello")
except ValueError as e:
    print(e)
try:
    10 / 0
except ZeroDivisionError as e:
    print(e)
try:
    {"a": 1}["b"]
except KeyError as e:
    print("Missing key:", e)
