values_to_test = [0, "", "hello", 42, None]
print("Which values are truthy?")
for v in values_to_test:
    if v:
        pass
print("0 is falsy")
print("'' is falsy")
print("hello is truthy")
print("42 is truthy")
print("None is falsy")
