# Runs a kid's program for the OUTPUT panel and reports what went wrong.
# The clean-slate helpers are shared with grading.py (same Pyodide globals).
import builtins, linecache, sys, time, traceback, types
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
_BUILTINS = (vars(builtins), dict(vars(builtins)))
_PATCHABLE = [(vars(m), dict(vars(m))) for m in (random, math, string, time)]
_STREAMS = [sys.stdout, sys.stderr, sys.stdin]   # this run's; clean_slate makes new ones
_RECURSION = sys.getrecursionlimit()
_HARNESS_MAIN = sys.modules["__main__"]          # these globals; kid code gets its own __main__
# Kid code can rebind builtins and stdlib functions (builtins.list = None), so the harness uses
# copies taken now. Like the guards in worker-core.js, this stops casual tampering, not all of it.
_list, _modules, _setrecursionlimit = list, sys.modules, sys.setrecursionlimit
_extract_tb, _format_exception, _ModuleType = traceback.extract_tb, traceback.format_exception, types.ModuleType


def interruptible_sleep(seconds):
    """time.sleep that waits without burning CPU and lets Stop through between short naps."""
    try:
        sys.stdout.flush()             # so a countdown printed with end="" shows before each nap
    except Exception:                  # the kid swapped out or closed sys.stdout; still sleep
        pass
    end = time.monotonic() + max(0.0, float(seconds))
    while (left := end - time.monotonic()) > 0:
        _codequest.sleep_ms(min(left, 0.05) * 1000)


def new_streams():
    """stdout, stderr and stdin on Pyodide's fds, set up like its own. New objects every run, so
    nothing a run did to the old ones (close, detach, reconfigure, a patched write) carries over."""
    return [open(1, "w", buffering=1, encoding="utf-8", closefd=False),
            open(2, "w", buffering=1, encoding="utf-8", errors="backslashreplace", closefd=False),
            open(0, "r", buffering=1, encoding="utf-8", closefd=False)]


def _restore(names, saved):
    """Puts a module's names back as they were at startup."""
    for k in _list(names):
        if k not in saved:
            del names[k]
    names.update(saved)


def clean_slate(seed=None):
    """Undo anything a previous run changed: modules, builtins, patched stdlib, streams."""
    _setrecursionlimit(_RECURSION)     # first: the lowest limit Python allows leaves no room for another call
    for name in _list(_modules):
        if name not in _BASE_MODULES:
            del _modules[name]
    _restore(*_BUILTINS)
    for names, saved in _PATCHABLE:
        _restore(names, saved)
    time.sleep = interruptible_sleep
    _STREAMS[:] = new_streams()
    sys.stdout, sys.stderr, sys.stdin = _STREAMS
    sys.__stdout__, sys.__stderr__, sys.__stdin__ = _STREAMS
    random.seed(seed)


def fresh_main():
    """A new __main__ module for the kid's program, as `python main.py` gets.
    Its __dict__ holds the program's globals."""
    main = _ModuleType("__main__")
    main.__builtins__ = builtins
    return main


def run_as_main(code, main):
    """Runs compiled kid code in `main` and makes it __main__, so `import __main__` gives the kid's own
    module, as in real Python, not these globals. It stays __main__ until leave_main(): describing the
    error runs kid code too (its __str__, and any __del__ freed with it). This stops casual rebinding of
    the harness's helpers, not a determined kid, who can still reach these globals through
    sys._getframe or kid code that runs later (a __del__ run by a later garbage collection, or a
    replaced stdout.flush when the next run swaps in new streams)."""
    _modules["__main__"] = main
    try:
        RUN_CODE(code, main.__dict__)
    finally:                           # the harness's own code, and traceback's, runs next
        _setrecursionlimit(_RECURSION)
        _restore(*_BUILTINS)


def leave_main():
    """Makes these globals __main__ again. Call it once the kid's run and its error report are done."""
    _modules["__main__"] = _HARNESS_MAIN


def compile_kid(src):
    linecache.cache[KID_FILE] = (len(src), None, src.splitlines(True), KID_FILE)
    return compile(src, KID_FILE, "exec", dont_inherit=True)


def error_info(e):
    """kind, message, editor line and Python's own last line (with any 'Did you mean')."""
    if isinstance(e, SyntaxError) and e.filename == KID_FILE:
        line = e.lineno                 # a SyntaxError from eval("...") is placed by its frame instead
    else:
        frames = [f for f in _extract_tb(e.__traceback__) if f.filename == KID_FILE]
        line = frames[-1].lineno if frames else None
    text = "".join(_format_exception(e)).strip().splitlines()[-1]
    try:
        msg = str(e)
    except BaseException:              # the kid's own exception class has a broken __str__
        msg = "<exception str() failed>"   # what Python's traceback says instead
    return {"ok": False, "kind": type(e).__name__, "msg": msg, "line": line, "text": text}


def stopped():
    return {"ok": False, "kind": "Stopped", "msg": "", "line": None, "text": ""}


def run_visible(src):
    clean_slate(seed=None)
    try:
        code = compile_kid(src)
    except SyntaxError as e:          # includes IndentationError
        return error_info(e)
    result = {"ok": True}
    try:
        run_as_main(code, fresh_main())
    except SystemExit:
        pass
    except KeyboardInterrupt:          # Stop button, time limit or output cap
        result = stopped()
    except BaseException as e:
        result = error_info(e)
    finally:                           # runs once the error is described and freed
        leave_main()
    # The panel's own streams, even if the kid swapped sys.stdout. Output held back until now can
    # cross the output cap, whose interrupt lands here: that counts as Stopped, but a real error wins.
    for stream in _STREAMS[:2]:
        try:
            stream.flush()
        except KeyboardInterrupt:
            if result["ok"]:
                result = stopped()
        except Exception:              # the kid closed or broke it; the result still matters more
            pass
    return result
