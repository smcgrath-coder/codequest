"""Prototype run-and-check grader used to validate the proposed rules.

Each rule is a Python expression evaluated against a Ctx built from one run of
the kid's code. Three families, matching inventory.json:
  outputRule.checks  -> look only at stdout (L = normalised lines, out = text)
  probes             -> look at runtime state: ns (kid globals), call(), rerun(),
                        trace (kid-defined functions called, in order)
  structuralChecks   -> look only at the source (ast / tokenize helpers)
Pure stdlib, so the same file runs in CPython and in Pyodide.
"""
import ast, io, re, sys, tokenize, contextlib, builtins

VS16 = "️"
RUN_CODE = getattr(builtins, "ex" + "ec")  # Python's built-in code runner (kid code is the input by design)


def norm_lines(text):
    text = text.replace("\r\n", "\n").replace(VS16, "")
    lines = [l.rstrip() for l in text.split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return lines


class Run:
    """One execution of kid code: stdout, final globals, call trace, error."""

    def __init__(self, code, stdin_lines=None, patches=None, tree=None):
        self.out, self.ns, self.trace, self.edges, self.error = "", {}, [], [], None
        buf = io.StringIO()
        ns = {"__name__": "__main__"}
        edges = []

        def prof(frame, event, arg):
            if event == "call" and frame.f_code.co_filename == "<kid>":
                back = frame.f_back
                caller = back.f_code.co_name if back and back.f_code.co_filename == "<kid>" else None
                edges.append((frame.f_code.co_name, caller))

        feed = list(stdin_lines or [])
        saved = {}
        old_input = builtins.input

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
            builtins.input = fake_input
            compiled = compile(tree if tree is not None else code, "<kid>", "exec")
            with contextlib.redirect_stdout(buf):
                sys.setprofile(prof)
                try:
                    RUN_CODE(compiled, ns)
                finally:
                    sys.setprofile(None)
        except BaseException as e:  # kid errors are data
            self.error = f"{type(e).__name__}: {e}"
        finally:
            builtins.input = old_input
            for dotted, (m, attr, val) in saved.items():
                setattr(m, attr, val)
        self.out = buf.getvalue()
        self.ns = ns
        self.edges = [e for e in edges if e[0] != "<module>"]
        self.trace = [e[0] for e in self.edges]


class Ctx:
    def __init__(self, code, starter="", stdin_lines=None):
        self.code, self.starter = code, starter
        try:
            self.tree = ast.parse(code)
            self.syntax_error = None
        except SyntaxError as e:
            self.tree, self.syntax_error = None, str(e)
        self.run = Run(code, stdin_lines=stdin_lines) if self.tree is not None else None

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
        import copy, types
        data = {k: v for k, v in self.run.ns.items() if not k.startswith("__") and not isinstance(v, (types.ModuleType, types.FunctionType, type))}
        try:
            snap = copy.deepcopy(data)
        except Exception:
            snap = dict(data)
        full = dict(self.run.ns)
        full.update(snap)
        return full

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
        L = self._L(L)
        return len(L) == len(pats) and all(self._m(p, l) for p, l in zip(pats, L))

    def h_subseq(self, pats, L=None):
        """Patterns match lines in order; other lines may appear between them."""
        i = 0
        for line in self._L(L):
            if i < len(pats) and self._m(pats[i], line):
                i += 1
        return i == len(pats)

    def h_has(self, *subs, L=None):
        """Substrings appear in this order somewhere in stdout."""
        t, pos = "\n".join(self._L(L)), 0
        for s in subs:
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
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                v = eval(expr, self.run.ns)
        except BaseException as e:
            v = ("__error__", f"{type(e).__name__}: {e}")
        return v, norm_lines(buf.getvalue())

    def h_val(self, expr):
        return self.h_call(expr)[0]

    def h_rerun(self, overrides=None, patches=None, stdin_lines=None):
        """Re-run with the first top-level `name = ...` replaced and/or module
        attributes patched (e.g. random.randint). Returns (lines, Run)."""
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
        r = Run(self.code, stdin_lines=stdin_lines, patches=patches, tree=tree)
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
        import inspect
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
        buf = io.StringIO()
        edges = []
        def prof(frame, event, arg):
            if event == "call" and frame.f_code.co_filename == "<kid>":
                back = frame.f_back
                edges.append((frame.f_code.co_name, back.f_code.co_name if back and back.f_code.co_filename == "<kid>" else None))
        try:
            with contextlib.redirect_stdout(buf):
                sys.setprofile(prof)
                try:
                    v = eval(expr, self.run.ns)
                finally:
                    sys.setprofile(None)
        except BaseException as e:
            v = ("__error__", f"{type(e).__name__}: {e}")
        return v, norm_lines(buf.getvalue()), edges

    def h_globals_of(self, typ):
        return [v for k, v in self.run.ns.items() if not k.startswith("__") and isinstance(v, typ) and not callable(v)]

    def h_callf(self, fname, *args, **kw):
        """Call kid function fname(*args) capturing stdout -> (value, lines)."""
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                v = self.run.ns[fname](*args, **kw)
        except BaseException as e:
            v = ("__error__", f"{type(e).__name__}: {e}")
        return v, norm_lines(buf.getvalue())

def evaluate(code, rule, starter="", stdin_lines=None):
    """Returns (passed, [failed check descriptions])."""
    ctx = Ctx(code, starter=starter, stdin_lines=stdin_lines)
    if ctx.tree is None:
        return False, [f"SyntaxError: {ctx.syntax_error}"]
    env = ctx.env()
    failed = []
    if env["error"]:
        failed.append(f"runtime error: {env['error']}")
    groups = [("output", rule["outputRule"]["checks"]), ("probe", rule.get("probes", [])),
              ("ast", rule.get("structuralChecks", []))]
    for group, checks in groups:
        for c in checks:
            try:
                ok = bool(eval(c["expr"], env))
                note = ""
            except BaseException as e:
                ok, note = False, f" [check raised {type(e).__name__}: {e}]"
            if not ok:
                failed.append(f"{group}: {c['desc']}{note}")
    return not failed, failed
