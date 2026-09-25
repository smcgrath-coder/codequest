# Validate guesses between 1 and 10
guesses = [5, 15, 0, 8, 3, -1, 10]

def validate_guess(guesses):
    valid = []
    for g in guesses:
        print(f"Guess {g} accepted!")
        if g < 1 or g > 10:
            print(f"{g} is out of range! Must be 1-10.")
        else:
            valid.append(g)
    return valid

print(validate_guess(guesses))
