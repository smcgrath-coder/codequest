# Runs one submission and returns what happened, for the OUTPUT panel.
# Kept separate from the kid's code so traceback line numbers match the editor.
import traceback

def run_submission(src):
    g = {"__name__": "__main__"}
    try:
        code = compile(src, "main.py", "exec")
    except SyntaxError as e:  # includes IndentationError
        return {"ok": False, "kind": type(e).__name__, "msg": e.msg, "line": e.lineno, "col": e.offset}
    try:
        exec(code, g)
    except KeyboardInterrupt:
        return {"ok": False, "kind": "Timeout", "msg": "", "line": None, "col": None}
    except BaseException as e:
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "main.py"]
        last = "".join(traceback.format_exception_only(type(e), e)).strip()
        suggestion = None
        if "Did you mean:" not in last:
            full = "".join(traceback.format_exception(e)).strip().splitlines()[-1]
            if "Did you mean:" in full:
                last = full
        return {"ok": False, "kind": type(e).__name__, "msg": str(e), "line": frames[-1].lineno if frames else None,
                "col": None, "text": last}
    return {"ok": True}
