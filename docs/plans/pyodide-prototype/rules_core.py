RULES = []

def E(id, determinism, fmt, summary, out, probes=(), ast=(), loop=("none", ""), hard=False, notes="", robotics=None, randomness=None):
    ast = list(ast)
    task_ast = [a for a in ast if a[2] == "task"]
    grade = "C" if ast else ("B" if probes else "A")
    RULES.append({
        "id": id,
        "determinism": determinism,
        "outputFormat": fmt,
        "outputRule": {"summary": summary, "checks": [{"desc": d, "expr": e} for d, e in out]},
        "probes": [{"desc": d, "expr": e} for d, e in probes],
        "structuralChecks": [{"desc": d, "expr": e, "source": s} for d, e, s in ast],
        "gradeability": grade,
        "gradeabilityTaskTextOnly": "C" if task_ast else ("B" if probes else "A"),
        "hardcodeable": hard,
        "loopRisk": {"level": loop[0], "why": loop[1]},
        "robotics": robotics,
        "randomness": randomness,
        "notes": notes,
    })
