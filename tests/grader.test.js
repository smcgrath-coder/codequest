import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateOffline } from "../src/grader.js";
import { CHAPTERS } from "../src/content.js";

const challenge = id => {
  for (const ch of CHAPTERS) {
    const r = ch.rooms.find(r => r.id === id) || (ch.boss?.id === id ? ch.boss : null);
    if (r) return r;
  }
  throw new Error(`no challenge ${id}`);
};

const PAREN_ERROR = /forgot the parentheses/;
const COLON_ERROR = /colon/;
const EQ_ERROR = /== \(double equals\)/;

// A minimal challenge whose only generated check is "use print()".
const PRINT_ONLY = { expectedBehavior: "Must print the message", task: "" };

const run = (code, ch = PRINT_ONLY, attempt = 1) => validateOffline(code, ch, attempt);

function assertPasses(code, ch) {
  const r = run(code, ch);
  assert.equal(r.error, null, `unexpected error: ${r.error}`);
  assert.equal(r.passes, true, `expected pass, got feedback: ${r.feedback}`);
}

describe("print rule ignores comments, strings and longer identifiers", () => {
  test("ch1_r5: the starter comment '# ... print their sum' does not trigger the parentheses error", () => {
    assertPasses("# Create a and b, print their sum\na = 15\nb = 27\nprint(a + b)\n", challenge("ch1_r5"));
  });

  test("ch1_r3: correct answer typed below the starter comment passes", () => {
    const ch = challenge("ch1_r3");
    assertPasses(ch.starterCode + "# My program prints a message\nprint(\"Comments help me remember\")\n", ch);
  });

  test("'print' followed by a space inside a string literal is not an error", () => {
    assertPasses('print("Please print this page")');
  });

  test("an identifier that ends in 'print' is not an error", () => {
    assertPasses('blueprint = "tower"\nprint(blueprint)');
  });

  test("print with a space before the parenthesis is valid Python", () => {
    assertPasses('print ("Hello, World!")');
  });

  test("the literal text of an f-string is ignored, but its {expressions} are real code", () => {
    assertPasses('x = 3\nprint(f"please print this {x}")');
    const IF_TASK = { expectedBehavior: "Must print even or odd using if", task: "" };
    assertPasses("print(f\"15 is {'even' if 15 % 2 == 0 else 'odd'}\")", IF_TASK);
    assertPasses('n = 4\nprint(f"{n} is {"even" if n % 2 == 0 else "odd"}!")', IF_TASK);
  });

  test("strings with escaped quotes, triple quotes and {{ escapes are handled", () => {
    assertPasses('print("He said \\"print this\\"")');
    assertPasses('doc = """print this\nand else this"""\nprint(doc)');
    assertPasses('x = 1\nprint(f"{{x}} is {x}")');
  });

  test("a string missing its closing quote is reported", () => {
    assert.match(run('print("You win!)').error || "", /closing quote/);
    assert.match(run('score = 3\nif score > 2:\n    print("You win!)\nelse\n    print("Try again")').error || "", /closing quote/);
  });

  test("a bracket that is never closed is reported", () => {
    assert.match(run('score = 3\nprint("Score:", score\nif score == 3:\n    print("Three!")').error || "", /never closed|closing \)/);
  });

  test("f-string debug '=', format specs and multi-line {expressions} are valid", () => {
    assert.equal(run('x = 3\nif f"{x=}" == "x=3":\n    print("ok")').error, null);
    assert.equal(run('n = 7\nif f"{n:=^10}":\n    print(f"{n:>5}")').error, null);
    assert.equal(run("print(f'{str(\n    5)}')").error, null);
    assert.equal(run('print(fr"\\{{a")').error, null, "a backslash in a raw f-string is an ordinary character");
    assert.equal(run('print(r"C:\\\\")').error, null);
    assert.match(run('print(r"C:\\")').error || "", /closing quote/, "a raw string cannot end in one backslash");
  });

  test("still catches the real Python 2 mistake", () => {
    assert.match(run('print "Hello"').error || "", PAREN_ERROR);
  });
});

describe("requirements are read from whole words, not substrings", () => {
  test("ch6_r2: 'different' does not demand an if statement", () => {
    const ch = challenge("ch6_r2");
    assertPasses(ch.starterCode.replace("# Call with 3 different heroes",
      "def hero_status(name, level):\n    print(f\"{name} — Level {level}\")\n\n# Call with 3 different heroes") +
      'hero_status("Alex", 5)\nhero_status("Sam", 3)\nhero_status("Jo", 9)\n', ch);
  });

  test("ch7_r2: 'modify' does not demand an if statement", () => {
    assertPasses('player = {"name": "Hero", "xp": 0, "gold": 50}\n\nplayer["level"] = 1\nplayer["gold"] += 25\nplayer["xp"] = 100\nplayer["title"] = "Adventurer"\nprint(player)\n', challenge("ch7_r2"));
  });

  test("a task that really asks for if/else still requires it", () => {
    const ch = { expectedBehavior: "Must use if/else to print 'big' or 'small'", task: "" };
    assert.equal(run('print("big")', ch).passes, false);
  });

  test("'understand the condition' does not demand 'and'", () => {
    const ch = { expectedBehavior: "Must print a message; understand the condition", task: "" };
    assertPasses('print("ok")', ch);
  });

  test("ch1_s2: '(no f-strings!)' forbids f-strings instead of requiring one", () => {
    const ch = challenge("ch1_s2");
    assertPasses(ch.starterCode + 'greeting = "Hello"\nname = "Alex"\nprint(greeting + ", " + name + "! Welcome to CodeQuest.")\n', ch);
    assert.equal(run(ch.starterCode + 'greeting = "Hello"\nname = "Alex"\nprint(f"{greeting}, {name}! Welcome to CodeQuest.")\n', ch).passes, false);
  });

  test("a nested-dictionary lesson does not demand nested if statements", () => {
    const ch = { expectedBehavior: "Must create nested dictionaries and print a value", task: "" };
    assertPasses('team = {"alex": {"xp": 10}}\nprint(team["alex"]["xp"])', ch);
  });
});

describe("constructs named in the task are required", () => {
  test("ch1_s2: a hard-coded sentence is not string concatenation", () => {
    assert.equal(run('print("Hello, Alex! Welcome to CodeQuest.")', challenge("ch1_s2")).passes, false);
  });

  test("ch4_boss: the countdown needs a loop and continue", () => {
    assert.equal(run('print("LIFTOFF!")', challenge("ch4_boss")).passes, false);
  });

  test("ch6_r2 and ch11_r4: 'define a function' needs def", () => {
    assert.equal(run('print("hello")', challenge("ch6_r2")).passes, false);
    assert.equal(run('print("hello")', challenge("ch11_r4")).passes, false);
  });

  test("ch8_r3: try/except needs try and except", () => {
    assert.equal(run('print("hello")', challenge("ch8_r3")).passes, false);
  });

  test("ch7_r2 and ch4_r3: dict work and looping are required", () => {
    assert.equal(run('print("hello")', challenge("ch7_r2")).passes, false);
    assert.equal(run('print("hello")', challenge("ch4_r3")).passes, false);
  });

  test("'Try again' in the task is not a request for try/except", () => {
    const ch = { expectedBehavior: "Must print 'Try again!' when the score is low", task: "" };
    assertPasses('print("Try again!")', ch);
  });

  test("constructs from the starter code must be kept, but earn no extra credit", () => {
    const ch = { expectedBehavior: "Must print each item in the list", task: "", starterCode: "items = [1, 2]\n" };
    assert.equal(run('print("hello")', ch).passes, false, "deleting the starter's list fails");
    assert.equal(run('items = [1, 2]\nprint(items)', ch).passes, true);
    const withIf = { expectedBehavior: "Must print each item in the list using if", task: "", starterCode: "items = [1, 2]\n" };
    assert.equal(run('items = [1, 2]\nprint("hello")', withIf).passes, false, "the kept list earns no credit toward the if");
  });
});

describe("nested if detection is structural", () => {
  const NESTED = { expectedBehavior: "Must use nested if statements to print the result", task: "" };

  test("2-space nesting counts as nested", () => {
    assertPasses('age = 12\nif age > 10:\n  if age < 13:\n    print("tween")', NESTED);
  });

  test("tab-indented nesting counts as nested", () => {
    assertPasses('age = 12\nif age > 10:\n\tif age < 13:\n\t\tprint("tween")', NESTED);
  });

  test("a multi-line string inside a nested block does not break the nesting", () => {
    assertPasses('sword = True\nif sword:\n    art = """\n  /\\\n /  \\\n"""\n    print(art)\n    if True:\n        print("ready")', NESTED);
  });

  test("a block header containing a multi-line string still has its colon", () => {
    assert.equal(run('for row in """#\n#""".split():\n    print(row)').error, null);
  });

  test("a flat if plus an unrelated deep line is not nested", () => {
    assert.equal(run('age = 12\nif age > 10 and age < 13:\n    print("tween")\nfor i in range(1):\n    for j in range(1):\n        print(j)', NESTED).passes, false);
  });
});

describe("variables bound without '=' are not flagged as undefined", () => {
  test("ch4_r2: for-loop variables pass", () => {
    const ch = challenge("ch4_r2");
    assertPasses("# Even numbers 2-10\nfor n in range(2, 11, 2):\n    print(n)\n\n# Countdown 5 to 1\nfor n in range(5, 0, -1):\n    print(n)\n", ch);
  });

  test("ch1_r1: forgetting the quotes, print(Hello), is caught", () => {
    const r = run("print(Hello)\n", challenge("ch1_r1"));
    assert.equal(r.passes, false);
    assert.match(r.error || "", /quotes/);
  });

  test("names bound by for, def, import, with, except, lambda, comprehensions and := are known", () => {
    for (const code of [
      'for i in range(3):\n    print(i)',
      'for a, b in [(1, 2)]:\n    print(b)',
      'def shout(word, times=2):\n    print(word)\nshout("hi")',
      'def greet():\n    return 1\nprint(greet)',
      'import random\nprint(random)',
      'from math import sqrt as root\nprint(root)',
      'with open("f.txt") as fh:\n    print(fh)',
      'try:\n    x = int("a")\nexcept ValueError as err:\n    print(err)',
      'nums = [n * 2 for n in range(3)]\nprint(nums)',
      'if (n := 5) > 3:\n    print(n)',
      'a, b = 1, 2\nprint(b)',
      'print(True)',
      'print(len)',
      'pt = (1, 2)\nmatch pt:\n    case (0, y):\n        print(y)\n    case _:\n        pass',
    ]) assert.equal(run(code).error, null, code);
  });

  test("function parameters pass", () => {
    assertPasses('def shout(word):\n    print(word)\n\nshout("hi")');
  });
});

describe("colon and == rules accept valid Python", () => {
  test("a trailing comment after the colon", () => {
    assertPasses('x = 7\nif x > 5:  # big numbers\n    print("big")\nelse:  # everything else\n    print("small")');
  });

  test("a one-line if body", () => {
    assertPasses('x = 7\nif x > 5: print("big")\nelse: print("small")');
  });

  test("augmented assignment in a one-line body is not '= instead of =='", () => {
    const r = run('a = 3\nb = 2\nwins = 0\nif a > b: wins += 1\nprint(wins)');
    assert.equal(r.error, null, r.error);
  });

  test("keyword arguments and the walrus operator in a condition", () => {
    assert.equal(run('words = ["a", "bbb"]\nif max(words, key=len) > "b":\n    print("long")').error, null);
    assert.equal(run('if (n := 5) > 3:\n    print(n)').error, null);
  });

  test("a condition split over lines inside parentheses", () => {
    assert.equal(run('a = 1\nb = 2\nif (a == 1 and\n        b == 2):\n    print("both")').error, null);
  });

  test("identifiers that start with 'else' are not else clauses", () => {
    assert.equal(run('elsewhere = 3\nprint(elsewhere)').error, null);
  });

  test("still catches a missing colon on if, elif and else", () => {
    assert.match(run('x = 1\nif x > 0\n    print("pos")').error || "", COLON_ERROR);
    assert.match(run('x = 1\nif x > 0:\n    print("pos")\nelif x < 0\n    print("neg")').error || "", COLON_ERROR);
    assert.match(run('x = 1\nif x > 0:\n    print("pos")\nelse\n    print("neg")').error || "", COLON_ERROR);
  });

  test("now catches a missing colon on for, while and def", () => {
    assert.match(run('for i in range(3)\n    print(i)').error || "", /colon[^]*for/);
    assert.match(run('n = 3\nwhile n > 0\n    n -= 1\nprint(n)').error || "", /colon[^]*while/);
    assert.match(run('def hi()\n    print("hi")\nhi()').error || "", /colon[^]*def/);
  });

  test("catches a missing colon on class, try, except, finally and with", () => {
    assert.match(run('class Hero\n    pass').error || "", /colon[^]*class/);
    assert.match(run('try\n    print(1)\nexcept:\n    print(2)').error || "", /colon[^]*try/);
    assert.match(run('try:\n    print(1)\nexcept ValueError\n    print(2)').error || "", /colon[^]*except/);
    assert.match(run('try:\n    print(1)\nfinally\n    print(2)').error || "", /colon[^]*finally/);
    assert.match(run('with open("f.txt") as f\n    print(f.read())').error || "", /colon[^]*with/);
    assert.match(run('d = {"a": 1}\nif d == {"a": 1}\n    print("same")').error || "", /colon[^]*if/);
  });

  test("keyword look-alikes with accents are ordinary names", () => {
    assert.equal(run('forêt = [1, 2]\nfor arbre in forêt:\n    print(arbre)').error, null);
    assert.equal(run('classé = 1\nprint(classé)').error, null);
  });

  test("still catches '=' where '==' was meant", () => {
    assert.match(run('x = 5\nif x = 5:\n    print("five")').error || "", EQ_ERROR);
    assert.match(run('n = 3\nwhile n = 3:\n    n -= 1').error || "", EQ_ERROR);
    assert.match(run('n = 3\nif n > 5:\n    print("big")\nelif n = 3:\n    print("three")').error || "", EQ_ERROR);
  });

  test("catches '=' inside brackets around a condition", () => {
    assert.match(run('x = 5\nif (x = 5):\n    print("five")').error || "", EQ_ERROR);
    assert.match(run('x = 5\nif(x = 5):\n    print("five")').error || "", EQ_ERROR);
    assert.match(run('t = 75\nif (t > 80):\n    print("Hot")\nelif (t = 75):\n    print("Warm")').error || "", EQ_ERROR);
    assert.match(run('x = 3\nif not (x = 3):\n    print("no")').error || "", EQ_ERROR);
  });

  test("'=' inside a call, a dict literal or a lambda default is fine", () => {
    assert.equal(run('def f(a=0):\n    return a\nif f(a=1):\n    print("yes")').error, null);
    assert.equal(run('d = {"a": 1}\nif d == {"a": 1}:\n    print("same")').error, null);
    assert.equal(run('if (lambda a=1: a)():\n    print("one")').error, null);
  });
});
