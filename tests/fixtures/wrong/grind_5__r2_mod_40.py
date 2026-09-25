year = 2024
if year % 4 == 0 and (year % 100 != 0 or year % 40 == 0):
    print(year, "is a leap year")
else:
    print(year, "is not a leap year")
