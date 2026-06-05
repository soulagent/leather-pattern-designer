---
description: Full smoke test for the Leather Pattern Designer (~15s)
---
Run the **full-tier** smoke test for the Leather Pattern Designer.

Execute this with the PowerShell tool from the project root:

```
& "tests\run-smoke.ps1" -Tier full
```

This runs everything in the quick tier, plus: save/load round-trip (geometry +
nextId + settings survive serialize→parse), stitch dot-count sanity for
rect/circle/path, the oversized-margin guard, and zoom-fit bounding-box
correctness.

After it runs, summarize the results. If any assertion FAILS, open `index.html`,
locate the function behind the failing assertion, and diagnose the regression
before making changes.
