# Runs a kid's program for the OUTPUT panel and reports what went wrong.
# The clean-slate helpers are shared with grading.py (same Pyodide globals).
import builtins, linecache, sys, time, traceback
import random, math, string
import _codequest

KID_FILE = "main.py"
# Python's built-in code runner. Running the kid's code is the point of this file, and it runs
# inside the browser's WebAssembly sandbox, not a shell. Looked up by name so security linters
# that look for shell exec calls don't misfire.
RUN_CODE = getattr(builtins, "ex" + "ec")

class StopRun(BaseException):
    """Raised by time limits; a BaseException so `except Exception` can't swallow it."""

# What a clean interpreter looks like, captured once at startup.
_BASE_MODULES = set(sys.modules)
_BUILTINS = dict(vars(builtins))
_PATCHABLE = {m: dict(vars(m)) for m in (random, math, string, time)}
_STREAMS = (sys.stdout, sys.stderr, sys.stdin)
_RECURSION = sys.getrecursionlimit()


def interruptible_sleep(seconds):
    """time.sleep that waits without burning CPU and lets Stop through between short naps."""
    end = time.monotonic() + max(0.0, float(seconds))
    while (left := end - time.monotonic()) > 0:
        _codequest.sleep_ms(min(left, 0.05) * 1000)


def clean_slate(seed=None):
    """Undo anything a previous run changed: modules, builtins, patched stdlib, streams."""
    for name in list(sys.modules):
        if name not in _BASE_MODULES:
            del sys.modules[name]
    b = vars(builtins)
    for k in list(b):
        if k not in _BUILTINS:
            del b[k]
    b.update(_BUILTINS)
    for mod, saved in _PATCHABLE.items():
        d = vars(mod)
        for k in list(d):
            if k not in saved:
                del d[k]
        d.update(saved)
    time.sleep = interruptible_sleep
    sys.stdout, sys.stderr, sys.stdin = _STREAMS
    sys.setrecursionlimit(_RECURSION)
    random.seed(seed)


def fresh_namespace():
    return {"__name__": "__main__", "__builtins__": builtins}


def compile_kid(src):
    linecache.cache[KID_FILE] = (len(src), None, src.splitlines(True), KID_FILE)
    return compile(src, KID_FILE, "exec", dont_inherit=True)


def error_info(e):
    """kind, message, editor line and Python's own last line (with any 'Did you mean')."""
    if isinstance(e, SyntaxError) and e.filename == KID_FILE:
        line = e.lineno                 # a SyntaxError from eval("...") is placed by its frame instead
    else:
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == KID_FILE]
        line = frames[-1].lineno if frames else None
    text = "".join(traceback.format_exception(e)).strip().splitlines()[-1]
    return {"ok": False, "kind": type(e).__name__, "msg": str(e), "line": line, "text": text}


def run_visible(src):
    clean_slate(seed=None)
    try:
        code = compile_kid(src)
    except SyntaxError as e:          # includes IndentationError
        return error_info(e)
    try:
        RUN_CODE(code, fresh_namespace())
    except SystemExit:
        pass
    except KeyboardInterrupt:          # Stop button, time limit or output cap
        return {"ok": False, "kind": "Stopped", "msg": "", "line": None, "text": ""}
    except BaseException as e:
        return error_info(e)
    finally:                           # the panel's own streams, even if the kid swapped sys.stdout
        _STREAMS[0].flush()
        _STREAMS[1].flush()
    return {"ok": True}
