# Grades a kid's program by what it does, using the challenge's rule from src/checks.js.
# Ported from docs/plans/pyodide-prototype/checklib.py. harness.py has already run in these globals,
# so its helpers (clean_slate, fresh_main, run_as_main, leave_main, compile_kid, KID_FILE, StopRun)
# are used directly.
#
# A rule has three groups of checks, each a Python expression evaluated after one run of the kid's code:
#   output    looks at stdout (L = normalised lines, out = text)
#   concepts  looks at the source (ast / tokenize helpers)
#   probes    looks at runtime state: ns (kid globals), call(), rerun(), trace (kid functions called)
import ast, builtins, contextlib, copy, inspect, io, json, re, string, sys, time, tokenize, types, unicodedata

# Python's built-in expression evaluator, for the rule's check expressions and the probes' calls into
# kid code. Both run inside the browser's WebAssembly sandbox, like RUN_CODE in harness.py, and it is
# looked up by name for the same reason: security linters that look for eval calls misfire on it.
# Taken now, so kid code that rebinds builtins.eval can't change how its checks are evaluated.
EVAL_EXPR = getattr(builtins, "ev" + "al")
# Copies taken now too. Kid code gets the same module objects as this file, and harness.py puts back the
# modules grading uses after every kid run (its _REPORTING), but the result grade_json sends and what a
# run printed shouldn't depend on that. sys can't be put back that way, and the capture buffer is the kid's
# sys.stdout while it runs, so `sys.stdout.getvalue = ...` would otherwise replace what it printed.
_dumps, _loads = json.dumps, json.loads
_setprofile, _getvalue = sys.setprofile, io.StringIO.getvalue

VS16 = "\ufe0f"                # emoji variation selector: invisible, and kids can't type it
# Characters kids can't easily type count as the ones they can.
SAME = str.maketrans({"—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "°": None})
HIDDEN_RUN_SECONDS = 2


def norm_lines(text):
    text = text.replace("\r\n", "\n").replace(VS16, "")
    lines = [l.rstrip() for l in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return lines


def _same(s):
    return s.translate(SAME) if isinstance(s, str) else s


class CappedIO(io.StringIO):
    LIMIT = 200_000
    def write(self, s):
        if self.tell() + len(s) > self.LIMIT:
            raise StopRun("output limit")
        return super().write(s)


# Watchdog for hidden runs. It is sticky: once the deadline passes it keeps raising, so a bare
# `except:` can't escape it, and a run counts as timed out once it has fired, even if kid code caught
# it and went on to finish. The events fire in every frame, including the roughly 160 in run_as_main's
# clean-up, so _tick skips the harness's own code: otherwise a program that ends just as time runs out
# takes a StopRun in that clean-up and keeps its broken builtins.
_MON = sys.monitoring
_TOOL = 4
_EVENTS = _MON.events.JUMP | _MON.events.PY_START
_deadline = [0.0]
_ticks = [0]
_fired = [False]
_OURS = run_as_main.__code__.co_filename   # harness.py's code, and this file's (both run through runPython)
_now, _set_events = time.monotonic, _MON.set_events   # copies, so kid code can't patch the watchdog off


def _tick(code, *_):
    if code.co_filename == _OURS:
        return
    _ticks[0] += 1
    if _ticks[0] & 1023 == 0 and _now() > _deadline[0]:
        _fired[0] = True
        raise StopRun("time limit")


_MON.use_tool_id(_TOOL, "codequest-grading")
_MON.register_callback(_TOOL, _MON.events.JUMP, _tick)
_MON.register_callback(_TOOL, _MON.events.PY_START, _tick)


def _arm(seconds):
    _deadline[0] = _now() + seconds
    _fired[0] = False
    _set_events(_TOOL, _EVENTS)


def _disarm():
    """Turns the watchdog off. Returns True if it fired, even if kid code caught the StopRun."""
    _set_events(_TOOL, 0)
    return _fired[0]


def _describe(e):
    """'Kind: message', even when the kid's own exception class has a broken __str__."""
    try:
        msg = str(e)
    except BaseException:
        msg = "<exception str() failed>"
    return f"{type(e).__name__}: {msg}"


class Run:
    """One execution of kid code: stdout, final globals, call trace, error."""

    def __init__(self, code, stdin_lines=None, patches=None, tree=None, seed=0):
        self.out, self.ns, self.trace, self.edges, self.error, self.timed_out = "", {}, [], [], None, False
        clean_slate(seed=seed)
        time.sleep = lambda s: None     # instant while grading
        buf = CappedIO()
        main = fresh_main()
        ns = main.__dict__
        edges = []

        def prof(frame, event, arg):
            if event == "call" and frame.f_code.co_filename == KID_FILE:
                back = frame.f_back
                caller = back.f_code.co_name if back and back.f_code.co_filename == KID_FILE else None
                edges.append((frame.f_code.co_name, caller))

        feed = list(stdin_lines or [])
        saved = {}
        old_input = builtins.input
        fired = False

        def fake_input(prompt=""):
            buf.write(str(prompt))
            if not feed:
                raise EOFError("EOF when reading a line")
            v = feed.pop(0)
            buf.write(v + "\n")  # echo like a terminal
            return v

        try:
            for dotted, val in (patches or {}).items():
                mod, attr = dotted.split(".")
                m = sys.modules.get(mod) or __import__(mod)
                saved[dotted] = (m, attr, getattr(m, attr))
                setattr(m, attr, val)
            # run_as_main puts builtins back when the program ends, which undoes this too.
            builtins.input = fake_input
            compiled = compile_kid(code) if tree is None else compile(tree, KID_FILE, "exec", dont_inherit=True)
            with contextlib.redirect_stdout(buf):
                _setprofile(prof)
                try:
                    _arm(HIDDEN_RUN_SECONDS)
                    try:
                        # No leave_main() afterwards: the error's __str__ and the probes should see the
                        # kid's own module as __main__. grade_json leaves it once grading is done.
                        run_as_main(compiled, main)
                    finally:
                        fired = _disarm()
                finally:
                    _setprofile(None)
        except SystemExit:              # exit() ends the program normally, as in a visible Run
            pass
        except StopRun:                 # time limit or output cap
            self.timed_out = True
        except BaseException as e:      # kid errors are data
            self.error = _describe(e)
        finally:
            builtins.input = old_input
            for dotted, (m, attr, val) in saved.items():
                setattr(m, attr, val)
        self.timed_out = self.timed_out or fired
        self.out = _getvalue(buf)
        self.ns = ns
        self.edges = [e for e in edges if e[0] != "<module>"]
        self.trace = [e[0] for e in self.edges]


class Ctx:
    def __init__(self, code, starter="", stdin_lines=None, seed=0):
        # The first run's input, kept so hidden re-runs can answer the same input() calls.
        self.code, self.starter, self.stdin_lines, self.seed = code, starter, stdin_lines, seed
        self.hidden_timeout = False     # a hidden run or call made by the current check never finished
        try:
            self.tree = ast.parse(code)
            self.syntax_error = None
        except SyntaxError as e:
            self.tree, self.syntax_error = None, str(e)
        self.run = Run(code, stdin_lines=stdin_lines, seed=seed) if self.tree is not None else None

    def env(self):
        r = self.run
        L = norm_lines(r.out)
        e = dict(L=L, out="\n".join(L), ns=self.snapshot(), trace=r.trace, edges=r.edges,
                 error=r.error, re=re, ast=ast, TREE=self.tree)
        for name in dir(self):
            if name.startswith("h_"):
                e[name[2:]] = getattr(self, name)
        return e

    def snapshot(self):
        """Deep copy of the kid's globals right after the run, so probes that call
        kid functions (which may mutate globals) cannot change what state checks see."""
        data = {k: v for k, v in self.run.ns.items() if not k.startswith("__") and not isinstance(v, (types.ModuleType, types.FunctionType, type))}
        try:
            snap = copy.deepcopy(data)
        except Exception:
            snap = dict(data)
        full = dict(self.run.ns)
        full.update(snap)
        return full

    def _hidden(self, fn, prof=None):
        """Calls fn() the way a hidden run is run: stdout captured and capped, under the time limit.
        Returns (value, stdout lines); an error comes back as the value ("__error__", "Kind: message")."""
        buf, fired = CappedIO(), False
        try:
            with contextlib.redirect_stdout(buf):
                _setprofile(prof)
                try:
                    _arm(HIDDEN_RUN_SECONDS)
                    try:
                        v = fn()
                    finally:
                        fired = _disarm()
                finally:
                    _setprofile(None)
                    # As run_as_main does: kid functions can change these too, and grading's code runs next.
                    _setrecursionlimit(_RECURSION)
                    _restore(*_BUILTINS)
                    for names, saved in _REPORTING:
                        _restore(names, saved)
        except StopRun as e:
            fired, v = True, ("__error__", f"StopRun: {e}")
        except BaseException as e:
            v = ("__error__", _describe(e))
        if fired:
            self.hidden_timeout = True
        return v, norm_lines(_getvalue(buf))

    # ---------- output helpers ----------
    @staticmethod
    def _m(pat, line):
        if isinstance(pat, str) and pat.startswith("re:"):
            return re.fullmatch(pat[3:], line) is not None
        return line == pat

    def _L(self, L):
        return norm_lines(self.run.out) if L is None else L

    def h_lines(self, pats, L=None):
        """Every line matches, in order, nothing extra."""
        L = [_same(l) for l in self._L(L)]
        return len(L) == len(pats) and all(self._m(_same(p), l) for p, l in zip(pats, L))

    def h_subseq(self, pats, L=None):
        """Patterns match lines in order; other lines may appear between them."""
        i = 0
        for line in self._L(L):
            if i < len(pats) and self._m(_same(pats[i]), _same(line)):
                i += 1
        return i == len(pats)

    def h_has(self, *subs, L=None):
        """Substrings appear in this order somewhere in stdout."""
        t, pos = _same("\n".join(self._L(L))), 0
        for s in subs:
            s = _same(s)
            k = t.find(s, pos)
            if k < 0:
                return False
            pos = k + len(s)
        return True

    @staticmethod
    def _close(a, b, tol=1e-6):
        return abs(a - float(b)) <= tol * max(1.0, abs(float(b)))

    def h_nums(self, values, L=None):
        """Numbers appear in stdout as an ordered subsequence (labels are free)."""
        found = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", "\n".join(self._L(L)))]
        i = 0
        for f in found:
            if i < len(values) and self._close(f, values[i]):
                i += 1
        return i == len(values)

    def h_nums_per_line(self, values, L=None):
        """Line k contains value k as a number; labels free; exactly len(values) lines."""
        L = self._L(L)
        if len(L) != len(values):
            return False
        for line, v in zip(L, values):
            got = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", line)]
            if not any(self._close(g, v) for g in got):
                return False
        return True

    def h_ints(self, line):
        return [int(x) for x in re.findall(r"-?\d+", line)]

    # ---------- runtime helpers ----------
    def h_call(self, expr):
        """Evaluate expr in the kid's namespace; returns (value, stdout lines)."""
        return self._hidden(lambda: EVAL_EXPR(expr, self.run.ns))

    def h_val(self, expr):
        return self.h_call(expr)[0]

    def h_rerun(self, overrides=None, patches=None, stdin_lines=None):
        """Re-run with the first top-level `name = ...` replaced and/or module
        attributes patched (e.g. random.randint). It gets the first run's input unless
        stdin_lines is given: without any, input() would end the program. Returns (lines, Run)."""
        tree = ast.parse(self.code)
        for key, src in (overrides or {}).items():
            name, _, nth = key.partition("#")
            nth, seen = int(nth or 1), 0
            for node in tree.body:
                if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
                    seen += 1
                    if seen == nth:
                        node.value = ast.parse(src, mode="eval").body
                        break
        ast.fix_missing_locations(tree)
        if stdin_lines is None:
            stdin_lines = self.stdin_lines
        r = Run(self.code, stdin_lines=stdin_lines, patches=patches, tree=tree, seed=self.seed)
        if r.timed_out:
            self.hidden_timeout = True
        return norm_lines(r.out), r

    def h_called(self, name, n=1):
        return self.run.trace.count(name) >= n

    def h_called_from(self, callee, caller):
        return any(c == callee and p == caller for c, p in self.run.edges)

    # ---------- structural (AST) helpers ----------
    def h_count(self, *types):
        return sum(isinstance(n, types) for n in ast.walk(self.tree))

    def h_calls(self, name):
        k = 0
        for n in ast.walk(self.tree):
            if isinstance(n, ast.Call):
                f = n.func
                if (isinstance(f, ast.Name) and f.id == name) or (isinstance(f, ast.Attribute) and f.attr == name):
                    k += 1
        return k

    def h_fdef(self, name=None):
        return [n for n in ast.walk(self.tree) if isinstance(n, ast.FunctionDef) and (name is None or n.name == name)]

    def h_defines(self, name, params=None, defaults=None):
        for f in self.h_fdef(name):
            a = f.args
            np_ = len(a.posonlyargs) + len(a.args) + len(a.kwonlyargs)
            nd = len(a.defaults) + sum(d is not None for d in a.kw_defaults)
            if (params is None or np_ == params) and (defaults is None or nd >= defaults):
                return True
        return False

    def h_docstring(self, name):
        return any(ast.get_docstring(f) for f in self.h_fdef(name))

    def h_has_elif(self):
        return any(isinstance(n, ast.If) and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If) for n in ast.walk(self.tree))

    def h_has_else(self):
        return any(isinstance(n, ast.If) and n.orelse for n in ast.walk(self.tree))

    def h_nested_if(self):
        for n in ast.walk(self.tree):
            if isinstance(n, ast.If):
                inner = list(n.body)
                if not (len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If)):
                    inner += n.orelse
                for m in inner:
                    if any(isinstance(x, ast.If) for x in ast.walk(m)):
                        return True
        return False

    def h_boolop(self, kind):
        k = {"or": ast.Or, "and": ast.And}[kind]
        return any(isinstance(n, ast.BoolOp) and isinstance(n.op, k) for n in ast.walk(self.tree))

    def h_chained(self):
        return sum(isinstance(n, ast.Compare) and len(n.ops) >= 2 for n in ast.walk(self.tree))

    def h_binop(self, opname):
        op = getattr(ast, opname)
        return sum(isinstance(n, ast.BinOp) and isinstance(n.op, op) for n in ast.walk(self.tree))

    def h_fstrings(self):
        return self.h_count(ast.JoinedStr)

    def h_imports(self, mod):
        for n in ast.walk(self.tree):
            if isinstance(n, ast.Import) and any(a.name == mod for a in n.names):
                return True
            if isinstance(n, ast.ImportFrom) and n.module == mod:
                return True
        return False

    def h_loop_has(self, *types):
        """Some for/while loop contains a node of these types."""
        for n in ast.walk(self.tree):
            if isinstance(n, (ast.For, ast.While)):
                if any(isinstance(m, types) for m in ast.walk(n) if m is not n):
                    return True
        return False

    def h_loop_calls(self, name):
        for n in ast.walk(self.tree):
            if isinstance(n, (ast.For, ast.While)):
                for m in ast.walk(n):
                    if isinstance(m, ast.Call):
                        f = m.func
                        if (isinstance(f, ast.Name) and f.id == name) or (isinstance(f, ast.Attribute) and f.attr == name):
                            return True
        return False

    def h_in_func(self, fname, *types):
        return any(isinstance(m, types) for f in self.h_fdef(fname) for m in ast.walk(f))

    def h_func_calls(self, fname, callee):
        for f in self.h_fdef(fname):
            for m in ast.walk(f):
                if isinstance(m, ast.Call):
                    g = m.func
                    if (isinstance(g, ast.Name) and g.id == callee) or (isinstance(g, ast.Attribute) and g.attr == callee):
                        return True
        return False

    def h_new_comments(self):
        """Comments the kid wrote (starter comments do not count)."""
        def comments(src):
            try:
                return [t.string.strip() for t in tokenize.generate_tokens(io.StringIO(src).readline) if t.type == tokenize.COMMENT]
            except (tokenize.TokenError, SyntaxError):
                return []
        old = set(comments(self.starter))
        return [c for c in comments(self.code) if c not in old]

    def h_str_consts(self):
        return [n.value for n in ast.walk(self.tree) if isinstance(n, ast.Constant) and isinstance(n.value, str)]

    def h_uses_name(self, name):
        return any(isinstance(n, ast.Name) and n.id == name for n in ast.walk(self.tree))

    def h_has_slice_step(self):
        return any(isinstance(n, ast.Slice) and n.step is not None for n in ast.walk(self.tree))

    def h_assigns_in_func(self, fname, var):
        for f in self.h_fdef(fname):
            for m in ast.walk(f):
                if isinstance(m, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                    targets = m.targets if isinstance(m, ast.Assign) else [m.target]
                    if any(isinstance(t, ast.Name) and t.id == var for t in targets):
                        return True
        return False

    def h_any_func_assigns(self, var):
        return any(self.h_assigns_in_func(f.name, var) for f in self.h_fdef())


    # ---------- extra helpers ----------
    NEG = re.compile(r"(?i)\b(not|false|no|isn't|isnt|weak|missing|nope)\b|\bn't\b")
    POS = re.compile(r"(?i)\b(true|yes|found|strong|is a leap|leap year|in the)\b")

    def h_polarity(self, line):
        """+1 affirmative, -1 negative, 0 unknown (for yes/no style lines)."""
        if self.NEG.search(line):
            return -1
        if self.POS.search(line):
            return 1
        return 0

    def h_nums_abs(self, values, L=None):
        found = [abs(float(x)) for x in re.findall(r"-?\d+(?:\.\d+)?", "\n".join(self._L(L)))]
        i = 0
        for f in found:
            if i < len(values) and self._close(f, abs(values[i])):
                i += 1
        return i == len(values)

    def h_nums_approx(self, values, tol=0.006, L=None):
        found = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", "\n".join(self._L(L)))]
        i = 0
        for f in found:
            if i < len(values) and abs(f - values[i]) <= tol:
                i += 1
        return i == len(values)

    def h_numset(self, values, L=None):
        """Every value appears somewhere as a number (any order)."""
        found = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", "\n".join(self._L(L)))]
        return all(any(self._close(f, v) for f in found) for v in values)

    @staticmethod
    def h_seq(values):
        """Patched function that returns scripted values in call order, cycling."""
        state = {"i": 0}
        def f(*a, **k):
            v = values[state["i"] % len(values)]
            state["i"] += 1
            return v
        return f

    @staticmethod
    def h_rec(dotted):
        """(wrapper, calls): wraps module.attr and records (args) of each call."""
        mod, attr = dotted.split(".")
        orig = getattr(sys.modules.get(mod) or __import__(mod), attr)
        calls = []
        def w(*a, **k):
            calls.append(a)
            return orig(*a, **k)
        return w, calls

    def h_sig(self, name):
        """(n_params, n_defaults) of a kid function at runtime, or None."""
        f = self.run.ns.get(name)
        if not callable(f):
            return None
        ps = list(inspect.signature(f).parameters.values())
        return len(ps), sum(p.default is not inspect.Parameter.empty for p in ps)

    def h_callees(self, fname, edges=None):
        """Kid functions called directly by fname, in call order (main run)."""
        return [c for c, p in (self.run.edges if edges is None else edges) if p == fname]

    def h_callt(self, expr):
        """Like call() but also returns the kid-function call edges made during it."""
        edges = []
        def prof(frame, event, arg):
            if event == "call" and frame.f_code.co_filename == KID_FILE:
                back = frame.f_back
                edges.append((frame.f_code.co_name, back.f_code.co_name if back and back.f_code.co_filename == KID_FILE else None))
        v, lines = self._hidden(lambda: EVAL_EXPR(expr, self.run.ns), prof)
        return v, lines, edges

    def h_globals_of(self, typ):
        return [v for k, v in self.run.ns.items() if not k.startswith("__") and isinstance(v, typ) and not callable(v)]

    def h_callf(self, fname, *args, **kw):
        """Call kid function fname(*args) capturing stdout -> (value, lines)."""
        return self._hidden(lambda: self.run.ns[fname](*args, **kw))


# ---------- feedback ----------
DEFAULT_HINTS = {
    "output": "Your output doesn't match what the task asks for yet. Read the task again and compare it with what your program printed.",
    "concepts": "The task asks you to use a particular Python tool. Read the task again.",
    "probes": "Your program printed the right answer, but it didn't change when I tried different values. Try calculating the answer with your variables instead of typing it in.",
}
HIDDEN_TIMED_OUT = "When I tested your program with different values, it never finished. Check your loops."
# The visible Run finished without an error before grading started, so these two are rare.
RUN_TIMED_OUT = "When I checked your program, it never finished. Check your loops."
RUN_FAILED = "When I checked your program, it stopped with an error ({error}). Run it again and make sure it finishes without errors."
PASSED = "Great work! Your program does exactly what the task asks. 🎉"
_PUNCT = frozenset(string.punctuation)
_SHOW_CHARS = 60                    # the longest line quoted back in feedback


def _literal_lines(expr):
    """The expected lines when expr is literally lines([...string literals...]), else None."""
    try:
        node = ast.parse(expr, mode="eval").body
    except SyntaxError:
        return None
    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "lines"
            and len(node.args) == 1 and not node.keywords and isinstance(node.args[0], ast.List)
            and all(isinstance(e, ast.Constant) and isinstance(e.value, str) for e in node.args[0].elts)):
        return [e.value for e in node.args[0].elts]
    return None


def _loose(s):
    """A line with capitals, punctuation and extra spaces ignored."""
    s = "".join(c for c in s.lower() if c not in _PUNCT and not unicodedata.category(c).startswith("P"))
    return " ".join(s.split())


def near_miss(got, want):
    """Names the first difference between the kid's lines and a lines([...]) check, without showing
    the expected output."""
    if len(got) != len(want):
        n = len(got)
        return f"Your program printed {n} line{'' if n == 1 else 's'}, but the task needs {len(want)}."
    for k, (g, w) in enumerate(zip(got, want), 1):
        if Ctx._m(_same(w), _same(g)):
            continue
        if not g:
            return f"Line {k} of your output is blank. Compare it with what the task asks for."
        shown = g if len(g) <= _SHOW_CHARS else g[:_SHOW_CHARS - 1] + "…"
        if not w.startswith("re:") and _loose(_same(g)) == _loose(_same(w)):
            return f"Line {k} of your output says `{shown}` — so close! Check your capital letters and punctuation."
        return f"Line {k} of your output says `{shown}`. Compare it with what the task asks for."
    return None


def _message(ctx, group, check):
    if ctx.hidden_timeout:          # replaces the check's hint: the loop, not the answer, needs fixing
        return HIDDEN_TIMED_OUT
    if group == "output":           # a lines([...]) check names the first difference instead of a hint
        want = _literal_lines(check["expr"])
        miss = near_miss(norm_lines(ctx.run.out), want) if want is not None else None
        if miss:
            return miss
    return check.get("hint") or DEFAULT_HINTS[group]


def _failure(group, index, message):
    return {"group": group, "index": index, "message": message}


def evaluate(code, rule, starter="", stdin_lines=None, seed=0):
    """Grades one program. Returns [{group, index, message}]: the first failed check of each group, in
    feedback order (output, concepts, probes), or only the first run's own failure. Empty means it passed."""
    ctx = Ctx(code, starter=starter, stdin_lines=stdin_lines, seed=seed)
    if ctx.tree is None:
        return [_failure("run", 0, RUN_FAILED.format(error=f"SyntaxError: {ctx.syntax_error}"))]
    if ctx.run.timed_out:
        return [_failure("run", 0, RUN_TIMED_OUT)]
    if ctx.run.error:
        return [_failure("run", 0, RUN_FAILED.format(error=ctx.run.error))]
    env = ctx.env()
    failures = []
    for group in ("output", "concepts", "probes"):
        for index, check in enumerate(rule.get(group) or []):
            ctx.hidden_timeout = False
            try:
                ok = bool(EVAL_EXPR(check["expr"], env))
            except BaseException:
                ok = False
            # A hidden run that hit the time limit fails its check, even if kid code caught the limit.
            if not ok or ctx.hidden_timeout:
                failures.append(_failure(group, index, _message(ctx, group, check)))
                break
    return failures


def grade_json(code, rule_json, starter, inputs_json, attempt):
    rule = _loads(rule_json)
    try:
        failures = evaluate(code, rule, starter=starter, stdin_lines=rule.get("inputs") or _loads(inputs_json), seed=rule.get("seed", 0))
    finally:
        leave_main()                   # run_as_main left the kid's module as __main__ for the probes
    if not failures:
        return _dumps({"passed": True, "feedback": PASSED, "failures": []})
    shown = [f["message"] for f in failures][: 2 if attempt >= 3 else 1]
    return _dumps({"passed": False, "feedback": " ".join(shown), "failures": failures})
