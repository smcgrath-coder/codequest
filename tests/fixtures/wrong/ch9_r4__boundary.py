# Validate guesses between 1 and 10
guesses = [5, 15, 0, 8, 3, -1, 10]

def validate_guess(guesses):
    valid = []
    for g in guesses:
        if 1 < g < 10:
            print(f"Guess {g} accepted!")
            valid.append(g)
        else:
            print(f"{g} is out of range! Must be 1-10.")
    return valid

print(validate_guess(guesses))
