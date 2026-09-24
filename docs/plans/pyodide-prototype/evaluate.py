"""Validate the proposed rules: reference must pass; starter, print('hello'),
and a hardcoded print of the reference output are tried to see what each rule family catches."""
import json, os, sys, importlib
W = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, W)
import checklib
from rules_core import RULES
for mod in sys.argv[1:] or ["rules_a", "rules_b", "rules_c"]:
    importlib.import_module(mod)
SOL = os.environ.get("SOL", "/Users/smcgrath/Downloads/codequest/tests/fixtures/solutions")
ch = {c["id"]: c for c in json.load(open(f"{W}/challenges.json"))}
runs = json.load(open(f"{W}/runs.json"))

def family(rule, fam):
    r = {"outputRule": {"checks": []}, "probes": [], "structuralChecks": []}
    if "out" in fam: r["outputRule"] = rule["outputRule"]
    if "probe" in fam: r["probes"] = rule["probes"]
    if "ast" in fam: r["structuralChecks"] = rule["structuralChecks"]
    return r

results = {}
for rule in RULES:
    cid = rule["id"]; c = ch[cid]; starter = c.get("starterCode", "")
    ref = open(f"{SOL}/{cid}.py").read()
    ok, why = checklib.evaluate(ref, rule, starter=starter)
    st_ok, st_why = checklib.evaluate(starter, rule, starter=starter)
    hello_ok, _ = checklib.evaluate('print("hello")', rule, starter=starter)
    # hardcoding attack: keep the starter, then print the reference stdout literally
    hc = starter + "\nprint(" + repr(runs[cid]["stdout"].rstrip("\n")) + ")\n"
    hc_out, _ = checklib.evaluate(hc, family(rule, ["out"]), starter=starter)
    hc_outprobe, _ = checklib.evaluate(hc, family(rule, ["out", "probe"]), starter=starter)
    hc_all, _ = checklib.evaluate(hc, rule, starter=starter)
    results[cid] = dict(ref=ok, ref_fail=why, starter=st_ok, hello=hello_ok,
                        hardcode_passes_output=hc_out, hardcode_passes_output_probes=hc_outprobe, hardcode_passes_all=hc_all)
    if not ok:
        print("REF FAIL", cid, why)
    if st_ok:
        print("STARTER PASSES", cid)
    if hello_ok:
        print("HELLO PASSES", cid)
print(f"rules: {len(RULES)}  ref pass: {sum(r['ref'] for r in results.values())}  starter pass: {sum(r['starter'] for r in results.values())}  hello pass: {sum(r['hello'] for r in results.values())}")
print(f"hardcoded-output attack passes: output-only {sum(r['hardcode_passes_output'] for r in results.values())}, output+probes {sum(r['hardcode_passes_output_probes'] for r in results.values())}, all checks {sum(r['hardcode_passes_all'] for r in results.values())}")
json.dump(results, open(f"{W}/eval-results.json", "w"), indent=1)
