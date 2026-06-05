# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file HTML/CSS/JS CAD app (`index.html`) for designing leather
patterns: draw pieces (rect/circle/bezier path), add wrap-bounded text boxes, simulate
saddle stitching, and export/print at true physical mm scale. **No build step, no dependencies, no npm** —
the entire app is `index.html`, opened directly in a browser. Not a git repo.

## Read these first

The repo is already heavily documented. The reference docs live in **`MD files/`**
(moved there for easier human browsing). Before making changes, read:
- **`MD files/CONTEXT.md`** — architecture, the `S` state object, shape data formats, the full
  function reference table, and a "Known gotchas & decisions" section. This is the
  primary orientation doc.
- **`MD files/DEVLOG.md`** — versioned changelog, one entry per session. **Append a new entry
  here every session** (the user relies on this pattern) and bump the version in both
  `MD files/CONTEXT.md` and `MD files/SHORTCUTS.md`.
- **`MD files/SHORTCUTS.md`** — keyboard/mouse reference; keep in sync when adding interactions.
- **`MD files/SKILL.md`** (+ `references/algorithm.md`) — the saddle-stitch hole-generation
  algorithm captured as a reusable skill.

## Commands

```powershell
tests\run-smoke.ps1 -Tier quick              # ~5s, fast logic checks (core+history)
tests\run-smoke.ps1 -Tier full               # ~15s, every feature (save/load, stitch, snap, colour, zoom-fit)
tests\run-smoke.ps1 -Feature "stitch-rect"   # run just one feature (or a comma/space list)

tests\run-build-smoke.ps1                    # ~1s, DESKTOP build wiring (Rust<->JS contract, versions)
tests\run-build-smoke.ps1 -Compile           # + `cargo check` (slower, proves the Rust compiles)
```

Also exposed as slash commands: `/smoketest-quick`, `/smoketest-full`. Run after any
logic change. Exit code 0 = all pass.

**Two independent smoke targets.** `run-smoke.ps1` tests the in-browser **app logic** in
headless Edge (no `window.__TAURI__`, so it can't see any desktop wiring). `run-build-smoke.ps1`
is the **desktop-build** counterpart: a fast static check that the Rust side (`desktop/src-tauri`)
and `index.html` agree on the Tauri command names + the `open-lpd` event, that the required
plugins/capabilities are declared, and that every version string is in sync. Run the build smoke
after any change under `desktop/` or to the native-IO / version code; it's the only thing that
catches a renamed command, a mismatched event name, or version drift before a `/build`.

For self-serve runs, **double-click `run-smoke.cmd`** in the project root — it prompts
for a tier (Q/F), runs the same `run-smoke.ps1`, and keeps the window open with the
PASS/FAIL summary. No terminal or Claude needed.

To view the app: open `index.html` directly in a browser (no server needed).

## How the tests work (important constraints)

Smoke tests exercise the **real** app logic — there is no mocked copy. `run-smoke.ps1`
reads `index.html`, injects `tests/smoke-harness.js` + a `window.__SMOKE__('<spec>')`
call before `</body>`, runs the temp page in **headless Edge** (`--dump-dom`), and
greps a JSON result out of the dumped DOM. The harness drives logic functions directly
(e.g. sets `S.penPts` then calls `finishPen()`) rather than simulating mouse events, so
tests stay deterministic. The harness is a `FEATURES` registry — `<spec>` is a tier
(`quick`/`full`) or a comma/space list of feature names, each feature rebuilding its own
scene. **To add a check:** add an `assert(...)` line to the relevant feature function in
`smoke-harness.js` (or add a new feature and register it in `ORDER`).

Hard-won constraints when touching the test harness:
- Keep `.ps1` files **ASCII-only** — PowerShell 5.1 mis-decodes no-BOM UTF-8, and a
  smart-quote from an em-dash becomes a string delimiter and breaks parsing.
- `--dump-dom` includes `<script>` source text, so the JSON result markers must be
  assembled from string fragments (only contiguous at runtime) or the runner's regex
  matches the harness source itself.

## Editing the app — what to keep in mind

- **All shape geometry is stored in mm.** The SVG `<g id="vp">` carries
  `translate(panX panY) scale(zoom * PX_PER_MM)`, `PX_PER_MM = 3.7795275591`. For a
  fixed N-pixel visual size inside the viewport, use `N / (S.zoom * PX)` mm.
- **Stroke-width units depend on `vector-effect`.** With `non-scaling-stroke`,
  stroke-width is screen pixels; without it, it's mm (scales with zoom). Mixing them
  silently produces ~0.1px invisible strokes. Use plain mm widths for shape/path
  outlines; reserve `non-scaling-stroke` for things that must stay pixel-exact (grid).
- **`renderContent()`** does a full `vp.innerHTML = h` rebuild — call it after state
  changes. **`updateTransform()`** only moves the group + updates grid stroke widths —
  use it for smooth 60fps pan/zoom. Hover re-renders only fire when `hoverHandle` /
  `hoverShape` actually change value.
- **`pushHist()` before mutating**, then `renderContent()`. `addShape()` wraps this.
- **`cancelPen()` must NOT call `setTool()`** — `setTool` unconditionally nulls
  `S.selId`, which would deselect a freshly-finished path. It switches tool state by hand.
- **Save format is `.lpd` (Leather Pattern Document — JSON, schema version 14).** The file
  extension was renamed from `.lpat` in v0.7.9 (no old-extension loading is kept, by the user's
  call). The JSON **schema** version is independent of the extension: older-schema documents must
  keep loading (they default missing fields — e.g. `color` → default blue, `snapShapes` → on,
  `hidden`/`locked` → false; a pre-v13 single `settings.page` migrates into `artboards[0]` at
  origin). Bump the schema version and add a round-trip assert (in the `saveload`/`artboards`
  feature) when the schema changes. Internal storage keys keep their legacy `lpat-` prefix
  (`lpat-recents`, `lpat-autosave`, `lpat-theme`, `lpat-props-w`) so existing browser state survives.

## Working style (observed user preferences)

- Short, punchy iterations: fix one thing, verify, update DEVLOG, move on.
- Don't over-engineer deferred items (e.g. stitch corner treatment on acute angles is a
  known, accepted rough edge — see MD files/CONTEXT.md backlog before "fixing" it).
