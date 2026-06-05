---
description: Quick smoke test for the Leather Pattern Designer (~5s)
---
Run the **quick-tier** smoke test for the Leather Pattern Designer.

Execute this with the PowerShell tool from the project root:

```
& "tests\run-smoke.ps1" -Tier quick
```

This injects `tests/smoke-harness.js` into a copy of `index.html`, runs it in
headless Edge, and reports PASS/FAIL for: placing a rect + circle + 3-point
bezier, history counts, and undo×3 / redo×1.

After it runs, summarize the results. If any assertion FAILS, open `index.html`,
locate the function behind the failing assertion, and diagnose the regression
before making changes.
