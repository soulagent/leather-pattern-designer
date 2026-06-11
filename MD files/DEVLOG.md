# Leather Pattern Designer — Dev Log

Single-file HTML app (no dependencies). Open `index.html` in any modern browser.
Save format: `.lpat` (JSON). Also exports `.svg` and prints to PDF via browser dialog.

---

## Roadmap / Backlog

_What's built and what's still wanted. The dated changelog (newest first) is below._

### ▶ Open TODOs (carry-forward, not started)
Remaining after the v0.7.20 accessibility/UX pass:
- [x] ~~**Promote remaining clickable `<div>`s to real controls.**~~ DONE v0.7.24 — section headers,
  tabs, artboard rows, colour swatches, layer rows + group headers are now focusable `role="button"`
  controls activated by Enter/Space (`kbActivate`); expand/collapse state announced via `aria-expanded`.
- [ ] **`prefers-reduced-motion` support.** Soften/disable transitions+animations under `reduce`.
  Deliberately deferred as low priority.
- [x] ~~**Finish palette tokenization.**~~ DONE v0.7.21 — all structural surface/border literals now
  reference `--panel`/`--raised`/`--border`/`--canvas`/`--bg`/`--dialog`/`--hover`; redundant light
  overrides dropped. Only the token defs (and the intentional dialog-only `#2f2f52`) remain as hexes.
- [ ] **Re-sync the `ui-language` skill / STYLE_GUIDE** if/when the user fine-tunes UI elements.
- [ ] **Visible update-check UX** (user feedback 2026-06-08). The launch update check is silent;
  the user prefers a brief **"Checking for updates…" popup** that **auto-closes if already current**
  and only **prompts when an update exists**. Apply to both the launch check and *Help ▸ Check for
  Updates* (give the manual path an in-progress indicator too). _Same change wanted in Leather Studio
  3D — see its CONTEXT.md backlog; the 3D app also has a bug where the prompt only shows on `.lpd`
  open, not on the home screen._
- [ ] **Partial / unequal-length seam joins** (user 2026-06-08, card-holder feedback). Seams
  currently expect ~equal-length edges (length-mismatch is a Tier-1 warning). Real goods need partial
  joins: a T-pocket connects only a small portion of its sides; a front pocket is much shorter than
  the back. Add seams that join a **sub-span** of an edge (or align by one end / a chosen offset) and
  relax the mismatch rule for intentional partial joins. Update `MD files/SEAM-MODEL.md`; consumed by
  Leather Studio 3D's `align2D`/stacking (U6).
- [x] ~~**Stitching across stacked/grouped pieces** (U7).~~ DONE v0.8.6 — shared-stitch seams
  (`stitch:{shared,spacing}`, assembly-schema v3); see the v0.8.6 entry.
- [ ] **Seam/stack orientation looks INVERTED (user 2026-06-09, FUTURE — not started).** On the
  SampleCardHolder the assembled 3D stack doesn't match the intended nesting — pieces appear joined on
  the **wrong side**, as if a seam edge was created on the **outside instead of the inside**. User's
  hunch: a **pen-tool edge-creation** issue (the T-pocket is a pen path; its seam edge winding/index
  may make the stack fold the wrong way). Reference renders in repo root: `Weird3DRender.png` (wrong)
  vs `IntendedStack.png` (intended 2D nesting). Suspects: pen-path **edge winding / index**, seam
  member orientation, or 3D `align2D` direction/anchor inference. Also mirrored in Leather Studio 3D
  `CONTEXT.md` backlog #8. NOT yet diagnosed.

_(Larger separate efforts are tracked in their own memories: the 3D companion app and the C++
migration — see the project memory.)_

### Already built (highlights)
Rect + pen/bezier tools · per-edge saddle stitching (even holes + geometric corners) · per-shape
colour · per-corner rect radii · convert-to-editable-path · per-anchor corner/smooth · shape-to-shape
snap · multi-select (shift-click + rubber-band + group move/delete) · shape rotation · rulers ·
multiple named **artboards** (per-artboard print/export, layer grouping, geometry in undo) · **text-box
tool** (per-run bold/italic markup, auto-height) · per-layer hide/lock · duplicate + alt-drag duplicate · auto-fitting on-shape labels ·
Save / Save As / auto-save · **light + dark themes on design tokens (WCAG AA)** · in-app Help + Quick
Start · headless smoke tests. **Desktop (Tauri):** multi-file tabs · native open/save · single-instance
· `.lpd` file association · signed **auto-update** via GitHub Releases · native **SVG + PNG** export.
**Accessibility:** keyboard-navigable click-to-open menus · focus ring · ARIA roles/labels.
_(Per-version detail is in the dated changelog below.)_

### Still wanted (open follow-ups — not started)
- **Pen:** true spline-closure geometry for smooth first/last anchors; drag-on-resume to set the
  resumed endpoint's handle.
- **Stitching / QOL:** default-spacing in Settings as the same stitching-iron dropdown the per-shape
  Spacing uses; selection-count / multi-select summary in the properties panel.
- _(The a11y, palette-tokenization and reduced-motion carry-forwards are in **Open TODOs** above.)_

### Companion app — 3D leather-goods preview/visualizer (vision, not started)
A **second, parallel product** the user has wanted for a long time: take a finished `.lpd` template and
preview the assembled real-world product. High-level goals: (1) **3D render** of the assembled item;
(2) **full camera control + lighting + texturing** — choose leather type/colour and stitch colour;
(3) generate **step-by-step build instructions** (Lego-manual style); (4) **validate** that the flat
templates will actually assemble correctly; (5) **bidirectional parametric sync** — change height/width
in 3D and have it update the `.lpd` pattern, and vice-versa. Full game plan, feasibility, risks, and
phasing live in the [[companion-3d-app]] memory. **Crux:** today's `.lpd` is purely 2D (cut shapes +
stitch lines) with **no assembly metadata** — which edges join, fold lines, material thickness — so
goals 3/4/5 are gated on first designing a seam/assembly data model (likely a `.lpd` extension or a
sibling assembly file, plus seam-tagging UI in *this* app). Goals 1/2 (render/camera/material) are low
risk; the 2D→3D fold is the hard, research-adjacent part — phase it, start with a flat-panel 3D viewer
MVP and a parametric catalogue of common goods before attempting general free-form folding.

**Update 2026-06-08 — the flat-panel viewer exists and the seam model is now designed.** Leather
Studio 3D shipped its Phase-1 viewer (loads `.lpd`, renders pieces as flat textured panels with
stitching, camera/lighting, themes; current v0.0.4). The **seam/assembly data model** (the crux above)
has a written design — **`MD files/SEAM-MODEL.md`** — a proposed save-schema **v15** that adds a
top-level `assembly` object (named seam groups of edges → handles N-way stacked seams; `type`
stitch/fold/glue; `folds[]`; per-piece `thickness`), built on the existing `{shape:id, edge:int}`
primitive. Design only — not yet implemented. Building it (authoring UI here + the fold/consume path
in the 3D app) is the next real Phase-2 step.

### LPD ↔ Leather Studio 3D bridge (future, requested — NOT started)
Two convenience features to connect this app with the 3D companion, logged 2026-06-08. Both are
**desktop-era** (rely on the Tauri launch path), neither started:

- **"View in Leather Studio 3D" / Export-to-3D button.** A button/menu item in this app that hands the
  current `.lpd` to the 3D viewer and opens it immediately. Reuses the **existing `open-lpd` launch
  contract** the 3D app already implements (single-instance + `take_launch_file`/`open-lpd` event):
  write the doc (native save or a temp file), then launch the 3D exe with that path (or `emit` to an
  already-running instance). The 3D app frames itself as *a preview of what could go wrong*, so a
  one-click "see it assembled" from the editor is the natural bridge. A plain **"Export to 3D"**
  (write a copy, don't launch) is the simpler first cut. _Gotcha: needs the 3D app installed /
  locatable; degrade gracefully (e.g. reveal the saved file) in the browser build._
- **Live preview on save.** Keep the 3D viewer open beside the editor and have it **auto-refresh when
  the `.lpd` is saved** — file-watch on the path (3D side) or an IPC ping (editor → 3D). Turns the
  pair into an author-here/see-there loop. Larger than the button; depends on both apps agreeing on a
  signal. Sequence it *after* the one-shot button.

_(Both consume `.lpd` read-only on the 3D side — the editor stays the sole writer. Cross-ref:
[[companion-3d-app]] memory and `Leather Studio 3D` repo.)_

### C++ migration plan (vision — NOT started; comprehensive steps + caveats)
The user's long-term aim: move the app off HTML/CSS/JS (+ Tauri/WebView2) to a **native C++** codebase
for more control, performance, and a **shared core with the [[companion-3d-app]]** (which will be
native/OpenGL anyway), and to retire the JS smoke-harness in favour of real C++ tests. This is a
*large* effort — the plan below is deliberately phased so the early, low-risk phases are valuable
**even if the full UI rewrite is never finished** (the extracted core is reusable by the 3D app).

> **Read this first — strategic framing.** The HTML app is mature (v0.7.24, 390 smoke asserts, signed
> auto-update, multi-artboard, text, a11y). A pure 2D-editor rewrite has *weak* ROI on its own — it
> re-implements a working product. The migration only clearly pays off if **(a)** it's tied to the 3D
> companion needing a shared native geometry/IO core, **(b)** we hit a browser ceiling (perf on huge
> patterns, precise device/colour control, plugin/CAD-kernel integration), or **(c)** the maintenance
> cost of the single-file JS app becomes the bottleneck. **Recommendation:** do Phases 0–2 (core + parity
> harness) as a small reusable investment, then *gate* Phases 3+ on a real need. Do **not** big-bang.

#### Guiding principles (non-negotiables)
1. **The browser app stays canonical until the C++ app reaches verified parity.** No removing `index.html`
   mid-migration — it's the reference implementation *and* the parity oracle.
2. **`.lpd` files must keep loading** — port the JSON schema (v14) + every back-compat migration (v1→v14
   defaulting) exactly. Round-trip equality is a test gate.
3. **mm-true output is sacred** — SVG/PNG/print must still come out at exact physical mm. This is the
   product's whole point.
4. **Port logic before UI.** The deterministic core (geometry, stitch, IO, hit-testing math) is the
   easy, high-value, testable part; the UI/rendering is the hard, framework-bound part.
5. **Parity-test against the JS** at every step — the existing smoke scenarios become golden tests.

#### Recommended stack (these are *decisions* — alternatives + caveats noted)
| Concern | Recommended | Alternatives | Why / caveat |
|---|---|---|---|
| Language/std | C++20 | C++17 | ranges/`std::variant`/designated-init help model code. |
| Build | **CMake + vcpkg** | Conan, Meson | Reproducible deps; matches Qt/Skia ecosystems. |
| GUI toolkit | **Qt 6 (Widgets)** | Qt Quick/QML; Dear ImGui + Skia; wxWidgets | Qt gives panels/menus/dialogs matching today's UI, cross-platform, **built-in accessibility**, and **`QPdfWriter`/`QPrinter` for mm-true print** (huge). **Caveat: licensing** — LGPLv3 is fine for *dynamic* linking; static linking / app-store / closed distribution may need a commercial Qt licence ($). ImGui is fast to prototype but has **near-zero a11y** (would throw away the v0.7.20–v0.7.24 accessibility work) and no native dialogs. |
| 2D vector render | **QPainter** (Qt) | Skia, Cairo, NanoVG | Beziers, dashed strokes, transforms, AA, text — all native. Skia = max control + same engine as Chrome (closest to today's pixels) but heavier to integrate. |
| Text shaping | Qt text / **HarfBuzz** | stb_truetype | Text-box wrap + per-run bold/italic + auto-height depend on **exact font metrics** — see blockers. |
| JSON (.lpd) | **nlohmann/json** | RapidJSON (faster), Glaze | Ergonomics first; .lpd files are small. |
| Tests | **Catch2** (or GoogleTest) | doctest | Re-express the 390 smoke asserts here → finally drops HTML-harness reliance. |
| SVG export | **hand-rolled writer** | resvg (render only) | We already build SVG strings in JS; a C++ string writer is a near-direct port. |
| Auto-update | **WinSparkle** (Win) / Sparkle (mac) | Squirrel, custom appcast | Replaces Tauri's updater — **re-platform risk, see blockers**. |

#### Target architecture (layered, UI-agnostic core)
```
core/      (no UI, no Qt) — the reusable, testable heart; also linked by the 3D app
  model/      Document, Shape (Rect|Circle|Path|Text variant), Artboard, Settings, enums
  geom/       PX_PER_MM + transforms, bbox/worldAABB/localAABB, rotPt/toLocal, pathToD/samplePath, snap
  stitch/     the saddle-stitch hole generator (port of SKILL.md / references/algorithm.md)
  io/         .lpd read/write + schema migrations; SVG string export
  history/    undo/redo snapshots
render/    Renderer interface (drawPath/drawText/dashed/transform/hitRegion) + QPainter impl
ui/        Qt: canvas widget, toolbar, menubar, property panel, layers, dialogs, shortcuts, a11y
platform/  file assoc, single-instance, recent files, autosave, print, PNG raster, auto-update
app/       wiring + main()
```
Key idea: **`core/` knows nothing about Qt**, so it compiles standalone, tests headlessly, compiles to
WASM for parity checks, and is shared with the 3D companion.

#### JS → C++ mapping (orientation for the port)
| Today (index.html) | C++ |
|---|---|
| `S` state object | `Document` (owns `std::vector<Shape>`, artboards, settings, undo stacks) |
| shape objects `{type,...}` | `struct Shape { ShapeType; std::variant<Rect,Circle,Path,Text>; common: id,color,rot,hidden,locked,label,...}` |
| `renderContent()` (`innerHTML` rebuild) | retained scene → `Renderer` immediate-mode paint per frame (Qt `paintEvent`) |
| `updateTransform()` 60fps pan/zoom | adjust view matrix + `update()` (no full rebuild) |
| `pushHist()`/snapshot JSON | `History::push(Document snapshot)` (start with JSON-string snapshots for byte-parity, optimise later) |
| `onDown/onMove/onUp`, `hitShape/hitHandle/hitEdge` | canvas widget mouse handlers + same hit-test math |
| stitch `stitchRect/Circle/Path` | `core/stitch/` pure functions (port 1:1, golden-tested) |
| `buildSaveData()/applyLoadedData()` + migrations | `io/lpd.{read,write}` + `migrate()` |
| smoke `FEATURES`/asserts | Catch2 test cases (1:1 mirror) |

#### Phased plan (each phase has a deliverable + an exit gate)
- **Phase 0 — Decisions & scaffolding.** Lock the stack (esp. GUI toolkit + licensing). Add a `cpp/` tree
  + `CMakeLists.txt`; **keep `index.html` untouched**. Add a CI job: build core + run Catch2 alongside
  the existing smoke. *Deliverable:* a "hello window" Qt app + a building empty `core` lib. *Exit:*
  one-command clone→build→test on Windows; CI green.
- **Phase 1 — Pure core (no UI).** Port, in this order (easiest/highest-value first): coordinate math →
  geometry helpers → **the stitch algorithm** → save/load + migrations → history. *Deliverable:* `core`
  static lib + Catch2 unit tests. *Exit:* core builds and unit tests pass on its own scenarios.
- **Phase 2 — Parity harness (the de-risker).** Expose `core` via a tiny CLI (JSON in → JSON out) *or*
  compile to WASM. Build a golden rig that feeds the **same scenarios as the JS smoke suite** and diffs
  C++ vs JS output (stitch-hole coords, bbox, `.lpd` round-trips, hit-tests) within tolerance.
  *Deliverable:* parity report; catalogue of any divergence (esp. float/text). *Exit:* core parity ≥
  threshold; **this is the natural off-ramp** — the core is already reusable by the 3D app even if we
  stop here.
- **Phase 3 — Rendering.** Implement the `Renderer` (QPainter): viewport transform (`zoom*PX_PER_MM`),
  grid, rulers, shapes, stitch holes (round/diamond/french), handles, dashed previews. Re-implement the
  **stroke-width-unit gotcha** deliberately (mm vs non-scaling). *Deliverable:* read-only viewer.
  *Exit:* visual parity vs browser screenshots on a `.lpd` corpus (within AA tolerance).
- **Phase 4 — Interaction & tools.** Port select/move/resize/rotate, marquee, snapping, edge selection,
  the **pen/bezier tool** (incl. v0.7.23 spline-close + drag-on-resume), text editing/auto-height,
  multi-select, layers panel, artboards. Property panel, menus, themed dialogs, shortcuts, **a11y via Qt
  accessibility**. *Deliverable:* feature-complete editor. *Exit:* feature-parity checklist + tests.
- **Phase 5 — Output.** SVG writer (mm-true), PNG raster at DPI, **print/PDF via `QPdfWriter` at true
  mm**, multi-artboard export/print. *Exit:* output dimensions exact in mm; files match browser within
  tolerance.
- **Phase 6 — Desktop integration.** File association, single-instance, recents, autosave, multi-file
  tabs, and **auto-update** (WinSparkle appcast + re-built signing). *Exit:* installer + updater at
  parity with today's Tauri build.
- **Phase 7 — Cutover.** Dual-run beta; migrate docs/skills/`CLAUDE.md`/`CONTEXT.md`; retire the Tauri
  wrapper; **decide the browser app's fate** (keep as permanent lightweight fallback vs retire). *Exit:*
  C++ app is the shipped product; docs updated.

#### Testing strategy
Catch2 unit tests for `core`; **golden/parity tests vs the JS** during transition (re-using smoke
scenarios as the oracle — directly delivers "drop the HTML harness"); **visual-regression** (screenshot
diff) for rendering; a smoke-equivalent mirroring the 390 asserts; CI matrix per-OS. Keep the JS smoke
running until Phase 7 so both implementations are checked against the same intent.

#### Caveats & blockers (severity)
- **[HIGH] Loss of the zero-build browser fallback.** Today "open `index.html`" needs nothing; C++ brings
  a heavy toolchain (compiler, CMake, vcpkg deps) and kills the instant edit→refresh loop. This is a
  real workflow regression for a solo maker who iterates in the browser.
- **[HIGH] Auto-update re-platforming.** Tauri's signed updater + GitHub-release pipeline (latest.json,
  `.sig`, the signing key in `~/.tauri/`) all get replaced (WinSparkle/Sparkle appcast + new signing).
  Recently-built infra (v0.7.14) would be rebuilt. Cross-platform updaters differ per OS.
- **[HIGH] Effort / opportunity cost.** This is *months* of solo work to re-reach a place we're already
  at in HTML. Every hour here is an hour not on new features or the 3D app — unless the core work is
  shared with the 3D app (the justification).
- **[HIGH/MED] Text metrics & wrapping parity.** Text-box wrap + per-run bold/italic + **auto-height**
  depend on font metrics; matching the browser's layout exactly (so old files look identical) is hard.
  Mitigate by **bundling the exact font** and accepting small, documented drift.
- **[MED] Print/PDF & SVG fidelity.** `QPdfWriter` is excellent but point/mm rounding differs subtly from
  browser print; SVG numeric formatting differs. Lock tolerances; test against printed rulers.
- **[MED] GUI licensing.** Qt LGPL is fine *dynamically linked*; static/commercial distribution may need
  a paid licence. ImGui/Skia avoid this but cost a11y + native widgets. A genuine budget decision.
- **[MED] Accessibility regression risk.** The v0.7.20–v0.7.24 a11y work is "free" in the browser; in
  C++ it depends entirely on the toolkit. Qt has decent a11y; **ImGui has almost none** — picking ImGui
  silently throws that work away.
- **[MED] Cross-platform parity.** Tauri already multi-targets; a C++ GUI must re-earn Win/mac/Linux
  parity (hi-DPI scaling, IME/text input, clipboard, file dialogs — all handled for us by the browser
  today).
- **[LOW] `.lpd` back-compat.** Mechanical but must be *exact* — every default/migration ported and
  round-trip-tested, or users silently lose data.
- **[LOW] Slower iteration loop.** Compile times vs browser refresh; mitigate with the headless core
  tests so most logic work doesn't need a UI rebuild.
- **[Supply chain]** vcpkg/Conan + Qt/Skia/HarfBuzz pull in real dependencies to vet, pin, and license —
  versus today's literally-zero npm/deps.

#### Open decisions (need the user before Phase 0)
1. **GUI toolkit:** Qt6 (a11y + mm print + licensing $) vs Skia+ImGui (control, MIT-ish, but a11y/widgets
   regress) vs other. *Biggest single decision — it shapes everything downstream.*
2. **Is this gated on the 3D companion?** If yes, design `core/` for both from day one (changes priorities).
3. **Keep the browser app as a permanent fallback**, or retire it at cutover?
4. **Target OS priority** (Windows-first assumed) and whether mac/Linux are in scope.
5. **Auto-update mechanism** + budget for code-signing certs / Qt commercial licence.
6. **Appetite/timeline** — full migration, or just Phases 0–2 (shared core) for now?

### First-time user experience (FTUE) — keep current
- **Maintenance commitment (user-stated):** whenever a headline feature lands or changes, refresh the
  Quick Start (`#qs-bg`) so a new user's first 60 seconds stays accurate. Treat it like the DEVLOG —
  part of finishing a feature, not an afterthought.
- **Planned: interactive guided tour** (not yet built) — a spotlight/coach-mark walkthrough that
  highlights a real button and shows a tooltip explaining it, stepping through the core flows
  (shape drawing → stitching → print). Builds on the static Quick Start. Design sketch: a dimmed
  full-screen scrim with a cut-out hole around the target element's bounding rect + an anchored
  tooltip with Next/Skip; a small ordered step list (selector → copy → optional "wait for action").

### Known accepted rough edges
- Very acute "sliver" corners (margin wider than the local feature width) — the inward offset is geometrically degenerate there; the min-gap pass prevents pile-ups but the geometry stays rough.

---

## v0.8.10 — 2026-06-11

### Per-edge stitch toggle list (UI/UX pass — discoverability)

First item of the queued `frontend-design` + `ui-language` UX audit (the
`todo-ui-ux-design-pass` batch). **Problem:** picking which edges of a piece get
stitched was an undiscoverable canvas gesture — the only cue was a `p-note`
("Tip: click an edge…"). The hover highlight and per-edge model already existed
(`edgeStitched`/`setEdgeStitch`, `S.hoverEdge` cyan overlay), but nothing surfaced
them.

**Fix:** the Stitching panel now renders a visible, self-documenting **per-edge
list** under "Stitch all edges" — one row per edge with a live checkbox.
- `renderEdgeStitchList(sh)` builds `#edge-stitch-list`; rect edges read
  **Top/Right/Bottom/Left** (`edgeLabel`/`RECT_EDGE_NAMES`, local frame), paths
  read **Edge N**. Edges owned by a shared-stitch seam show a disabled checkbox +
  an orange **seam** tag (they're stitched by the seam layout, not independently).
- Two-way canvas sync: **hovering a row** glows the matching edge on the canvas
  (drives the existing `S.hoverEdge` overlay via `hoverEdgeRow`); **clicking a row**
  selects that edge (`selectEdgeRow`, same state a canvas edge-click sets);
  **toggling the checkbox** stitches just that edge (`toggleEdgeFromList`).
- The list is guarded against no-op rewrites (`box._h` cache) so a hover-only
  re-render (`renderContent → updatePropsPanel`) doesn't destroy the row under the
  cursor. Replaces the old single canvas-select-only `#edge-stitch-row` checkbox;
  hint copy rewritten as an invitation.

HTML/CSS/JS only (`.es-grp`/`.es-row`/`.es-name`/`.es-tag` + a `body.light`
override). No save-format change. `peredge` smoke gains 4 asserts (labels + row
rendering mirror state).

### Empty-state invitation (UI/UX pass — #2)

Second item of the same audit. **Problem:** the "No shape selected" panel was a
dead end — `frontend-design` is explicit that an empty screen is an invitation to
act. **Fix:** `#no-sel-msg` is now a small actionable prompt — a title, a one-line
sub, and three clickable draw-tool buttons (Rectangle B / Pen P / Text T, each
calling `setTool`). `updatePropsPanel` tailors the copy: a blank document reads
**"Start your pattern → Draw your first piece"**, a populated-but-deselected
document reads **"No shape selected → Click a piece to edit it, or draw a new
one."** New `.ns-*` styles use existing tokens (theme-safe — hover is accent
border + `var(--text)`, no white-on-light). `emptystate` smoke feature (4).

### Toolbar + tool UX (UI/UX pass — #3, #4, #5, #6)

Four more audit items, same version.

- **#3 Per-tool status hints.** Every tool now teaches its basic use, not just the
  Pen. New `TOOL_HINTS` map; `applyToolChrome` writes the active tool's one-liner to
  a new right-aligned `#st-hint` status-bar span (italic, faint). The Pen keeps its
  richer `#pen-hints-sec` panel on top. The active tool label (`#st-tool`) also reads
  a touch brighter than the passive telemetry beside it.
- **#4 Unified toolbar icons + Delete removed.** Replaced the per-button Unicode
  glyphs (each with its own inline `font-size` patch) with inline **SVG** icons at one
  consistent 24-viewBox / 18px size (`currentColor`, matching the layer eye/lock).
  Text and Help stay as letter glyphs via `.t-ico-letter`. The destructive **Delete**
  button was pulled out of the tool column (it's already Edit ▸ Delete Selected + the
  Del key) so it can't be misfired as if it were a mode.
- **#5 Shortcut key badges.** A faint Figma-style `.t-key` badge sits bottom-right of
  each tool whose icon isn't already its letter (V/R/A/B/P/S) — passive shortcut
  teaching; brightens on the active button.
- **#6 Empty-canvas prompt.** A blank document shows a centred **french-stitch-framed**
  "Draw your first piece" card on the canvas (`#canvas-empty`, reuses `frenchBorder` —
  the product signature, per ui-language §7), `pointer-events:none`, hidden in print and
  the moment a shape exists (`updateCanvasEmpty` in `renderContent`). The stitch frame is
  sized to the **measured** text card (`.ce-card` offset size → `frenchBorder(w,h)`) so the
  slits never overlap the copy (fixed-size box was the first cut). Plus **entry centring**:
  new `centerOnArtboard()` frames the ACTIVE artboard centred in the viewport (zoom capped
  at 1) on first launch + every new/blank doc (`afterDocSwap` when `!shapes.length`, and at
  init) — replaces the old top-left default so the page and the prompt line up.

### Default shape colour cycles the palette (user request)

New shapes now default to the **next preset colour, looping** (`nextShapeColor()` over
`SHAPE_COLORS`, session-global `_colorCycle`) instead of all-blue — applied in `addShape`
(rect/circle, guarded by `color==null`), the pen-finish path literal, and `makeTextShape`.
Clones/duplicates keep their own colour; an explicit pick still overrides. The pen's
in-progress preview renders in editor chrome (cyan/white/orange), not the shape colour, so
the colour is decided once at finish — no preview mismatch.

### P3 polish (UI/UX pass — #7, #8, #9)

The last three audit items.

- **#7 Status-bar hierarchy.** Stateful readouts (active tool `#st-tool`, snap-on
  `#st-snap`) now read brighter (`--text-2`, 600); passive telemetry (pos/zoom/shapes/
  history) recedes to `--text-faint`. The bar was six equal-weight items before.
- **#8 Settings out of Edit → menubar gear.** `Settings…` was an odd fit under Edit;
  it's now an always-visible cog button (`#mb-settings`, inline SVG, `.mb-icon-btn`)
  on the right of the menubar next to the theme toggle. Removed from the Edit menu.
- **#9 3D-companion pointer.** The Assembly panel now has a one-line callout —
  "Open this .lpd in Leather Studio 3D to preview the assembled product in 3D" — so the
  seam/fold→3D handoff is discoverable from where you author it.

Combined for v0.8.10: HTML/CSS/JS only, no save-format change. `emptystate` (4) +
`toolux` (12, incl. entry-centring + gear + 3D pointer) + reworked `color` (8, incl.
cycle) smoke → full **518/518**, build smoke 64. **All 9 UI/UX audit items + the
colour-cycling extra are done.**

---

## v0.8.9 — 2026-06-10

### Shared-seam end holes follow the normal corner rules (one hole per corner)

User feedback on the shipped U7+margin work: *"stitch as one seam should follow the same rules as
the normal stitch behaviour, the extreme edge stitches are still overlapping"* — a crossed/doubled
teal hole at both ends of a shared seam. Root cause (two holes ~one margin apart, at different
angles): `seamStitchLayout` forced its endpoint holes at the **raw run ends** (inset only
perpendicular to the seam edge), while the adjacent perpendicular edges still placed their own
inset-corner hole (the seam edge reads `edgeStitched()=false`, so they also far-corner-pushed).

- **End holes inset along the edge too.** The shared run's end holes now sit the stitch margin in
  from the run ends (`N = round((run−2·margin)/spacing)`) — the same rule as `stitchRect`'s inner
  corners, so a seam ending at a piece corner lands exactly on the inset corner. The inset is the
  same **mm** on every member, so holes still coincide across the stack (U7's guarantee).
- **Corner dedupe in `stitchFor`.** Independent holes within 0.75mm of a seam hole are dropped —
  the seam owns the corner (its layout must stay shared); catches both the perpendicular edge's
  start hole and its far-corner push, and the near-coincident miter at non-square path corners.
- **3D parity (Leather Studio 3D v0.0.13).** `seamStitchSegments3D` trims each member's inset poly
  by the margin (`clipPolyByT`) with N from the trimmed reference; `collectStitches` applies the
  same 0.75mm dedupe; `buildAssembly` now carries `stitch.margin` through to the resolved seam
  (it was silently dropped — a custom seam margin fell back to the default in 3D).

`seam` smoke: count formulas updated to the inset run, +5 `U7fix` asserts (end holes on the inset
corner, exact one-hole-per-corner total vs independently stitched side edges). Also repointed two
harness checks at live functions (`getFitBox` coverage, `closeHelp`) after the dead-code cleanup
removed `getBBox`/`toggleHelp`. Full **494/494**, build smoke 64/64.

---

## v0.8.8 — 2026-06-09

### Cleanup pass (2026-06-10, pre-release addendum)
Audit pass across both repos. Removed two functions with zero references: `getBBox()`
(superseded by `getFitBox()`/`worldAABB`) and `toggleHelp()` (help is opened/closed via
`openHelp`/`closeHelp` directly). No behaviour change; quick smoke 13/13 + build smoke 64/64.
Also: untracked `Leather Pattern Designer.lnk` from the public repo (machine-specific shortcut;
now gitignored via `*.lnk`, local file kept), and **refreshed `STYLE_GUIDE.md` v0.7.18 → v0.8.8**:
tokenization note (palette fully tokenised since v0.7.21), menus now documented as click-to-open +
keyboard (was "⚠ hover-only"), §9 rewritten from "six gaps" to "fixed, here's the recipe" (only
`prefers-reduced-motion` remains open), added the v0.8.x seam/fold/assembly canvas colours
(amber picks `#f59e0b`, violet folds `#a78bfa`, golden-angle seam hues, dashed-red mismatch),
the `seam-aid` screen-only rule, `.p-fl-w` labels, `confirmModal` 3-way `alt`, and the Assembly
panel component pattern. Checklist gains the role=button/kbActivate and seam-aid items.

### Partial seams authored in mm, not arbitrary % (assembly-schema v4; paired with 3D v0.0.11)

Partial/unequal seam joins were authored as **Start % / End %** sub-spans (`t0`/`t1` fractions of an
edge) — arbitrary and invisible to the user, who had to hand-compute `12/70 ≈ 0.17` to mean "12 mm
from the top." Replaced with a **mm** model:

- **Data model.** A member stores `offset` (mm from a reference end `from: start|end`); the join
  **length auto-derives = the shortest ("mating") member edge**. New `seamRunLengthMM` / `memberSpan`
  / `edgeEndLabels` resolve a member to its `{t0,t1}` span for every existing consumer (canvas band,
  shared-stitch layout, export, 3D). **Legacy `t0`/`t1` files load unchanged** (used only when no
  `offset` is present). Assembly-schema **v3 → v4**; `normMember` persists `offset`/`from` (or carries
  legacy fractions through). New round-trip asserts.
- **Authoring UI.** The per-member partial controls are now a **"Measure from"** picker — the edge's
  two ends labelled by direction (Top/Bottom or Left/Right, derived from the edge geometry) — plus an
  **Offset (mm)** field, with the auto **Join … mm** length shown read-only. `setMemberOffset` /
  `setMemberFrom` replace `setMemberSpan` (and migrate a legacy member to mm on first edit).
- **Canvas preview.** The bold seam band now spans the **true mm length** anchored at the chosen
  reference end (so a 12 mm gusset edge previews as a 12 mm cap on the 70 mm side — see
  `EdgeIntention.png`), and the anchor dot marks each member's reference end.
- New semantics for a partial member with **no** offset: it joins its first *run* mm (the mating
  length), not its whole edge — the intended true-length behaviour.

`seam` smoke gains 5 `U6mm` asserts (auto run = mating edge, offset slides the run, from=end). App
smoke **487 → 492**. Diagnosis note: this — not the 3D "flipped render" theory — was the real cause of
the card-holder's mis-aligned T-pocket; the gusset just needed a clear mm offset from the top.

---

## v0.8.7 — 2026-06-09

### Stitch fix — shared-stitch holes respect the margin (paired with 3D v0.0.10)

User feedback on the shipped U7: the shared "stitch as one seam" placed holes **on the seam line**,
ignoring the stitch margin. `seamStitchLayout` now offsets each member's holes **inward by the margin**
(`seam.stitch.margin`, else default) toward the shape interior — new `seamShapeCentroid` picks the
inward normal — so the shared stitch sits in from the edge like independent stitching. The 3D companion
got the matching fix plus a thread-mirror fix (v0.0.10). Geometry-only; schema v15 / assembly v3
unchanged. `seam` smoke still 82 (positions verified). _Carry-forward TODOs (next session): the 3D
render may be showing the **back face** (flipped), and the saddle-stitch slant leans the wrong way —
see the DEVLOG Open TODOs + memory._

---

## v0.8.6 — 2026-06-09

### U7 — shared stitch across stacked pieces (assembly-schema v3)

Card-holder feedback U7 (cross-app, paired with Leather Studio 3D v0.0.9). Until now every piece was
stitched **independently** — each edge's holes from its own length/margin/spacing — so two edges joined
by a stitch seam got different hole counts and the holes didn't line up when the pieces are stacked. You
couldn't run **one** saddle stitch through the whole stack (the card holder: back · T-pocket · front on
one seam). U7 lets a **stitch seam own one shared hole layout**.

- **Schema v3 (back-compat).** Optional per-seam `stitch:{shared:true, spacing?}`. Absent = today's
  independent stitching, so every existing file is byte-identical. `normSeam` persists it (stitch type
  only); `normAssembly` advances the internal `assembly.version` 2→3. No `.lpd` file-version bump (v15).
- **Shared layout.** `seamStitchLayout(seam)` computes `N = round(refLen/spacing)` once and stamps the
  **same hole count at matching fractions** onto every member, mapped into each member's `[t0,t1]` span
  (U6) from the anchor end — so holes coincide across the stack. Helpers `edgePointAt`/`edgeTangentAt`/
  `sharedSeamForEdge`/`sharedSeamHolesForShape`.
- **Override.** `edgeStitched()` returns false for a shared-seam member edge (its independent stitching
  is overridden); `stitchFor()` merges in the seam holes — even when the piece's own `hasStitch` is off.
- **Partial overlap** (U6) supported: holes stay within each member's sub-span.
- **Authoring.** Seam editor (stitch type) gains a **"Stitch as one seam"** checkbox + a **Spacing**
  iron-size dropdown (`setSeamShared`/`setSeamStitchSpacing`).
- **Deferred (first cut, agreed):** rounded-rect edges as members (synthetic path loses the id); exact
  arc-length sampling on curved members (param-space for now — exact for straight edges); de-duping a
  forced corner shared with an adjacent independently-stitched edge.

Design + LPD↔3D contract in `MD files/SEAM-MODEL.md` §13. `seam` smoke gains 11 U7 asserts (shared
layout, override, round-trip, partial sub-span); full **487/487**, build smoke **64/64**.

---

## v0.8.5 — 2026-06-09

### Card-holder feedback polish: readable seam labels + partial-seam canvas viz

Three user-flagged issues on the just-shipped partial-seam work. Two are LPD (below); the third is
the 3D stitch-slant fix, shipped as Leather Studio 3D v0.0.8.

- **Unreadable property labels (fix).** The seam editor reused the `.p-fl` field-label class, which
  is hard-set to `width:13px` (it was built for single-char labels like X/Y/W/H). Multi-char labels
  were clipped — "Order"→"Ord", "Allow."→"Allo", "Anchor"→"Anc", "Start %"→"Star". Added a
  `.p-fl-w` (auto-width, `white-space:nowrap`) class and applied it to the seam-editor labels (Order,
  Allow., Join, Anchor, Start %, End %); the shape-props **Angle** label switched to it too (it had
  been working around the clip with an inline `width:auto`).
- **Readability smoke (new).** New `readability` smoke feature renders a partial seam + a selected
  shape and asserts no `.p-fl`/`.p-fl-w` field label is clipped (a flex-item label whose text
  overflows has `scrollWidth > clientWidth`); guarded by a "labels are laid out" check so it can't
  false-pass if the panel isn't visible. Verified it has teeth (reverting one label to `.p-fl` fails
  it: `"Order" (13<28)`).
- **Partial-seam join is now visible on the canvas.** A partial seam previously showed only Start %/
  End % numbers in the panel. The seam overlay now draws the `[t0,t1]` joined sub-span of each member
  edge as a **bold band** (halo + seam-colour, ~8.5/5 px) offset to the edge's interior side, with a
  **dot at the anchor end** (the end mated spans line up from). New helpers `edgePointAt(sh,e,t)` +
  `edgeBandD(sh,e,t0,t1,off)` (interior-offset polyline; rect = straight, path = sampled cubic);
  `edgeMidpoint` now delegates to `edgePointAt`. Screen-only (`seam-aid`, stripped from print/export).

`seam` smoke gains `edgePointAt`/`edgeBandD` geometry asserts; new `readability` feature (4). Full
**475/475**, build smoke **64/64**.

---

## v0.8.4 — 2026-06-08

### Partial / unequal-length seams (U6) — assembly-schema v2

Card-holder feedback U6 (cross-app, paired with the same change in Leather Studio 3D). The v1 seam
model assumed every member was the **whole edge** and that mated edges were **equal length** (a
difference was flagged as a Tier-1 problem). Real goods break this — a T-pocket joins only a portion
of its side; a front pocket is much shorter than the back. v2 adds two optional, back-compatible
pieces (no `.lpd` **file** bump — v15 already carried `assembly`; only the internal
`assembly.version` advances 1→2):

- **Member sub-span** — optional `t0`/`t1` ∈ [0,1] (fractions of the edge's arc length, default whole
  edge). Stored only when it's a real sub-span, so v1 files + full-edge members stay byte-identical.
  `normMember()` (new) + `normSeam()` now **persist** these — they previously stripped unknown fields.
- **Seam `fit` + `anchor`** — `fit:"partial"` marks an intentional unequal/sub-span join: the
  length-mismatch hint is **suppressed** and the mated spans line up from the `anchor` end
  (`"start"`/`"end"`). Absent = `"full"` = exact v1 behaviour.
- **Authoring** — the seam editor gains a **Join: Full / Partial** dropdown; Partial reveals an
  **Anchor** dropdown + per-member **Start % / End %** span fields (`setSeamFit`/`setSeamAnchor`/
  `setMemberSpan`). Switching back to Full clears the spans. `seamLengthIssues()` returns `[]` for
  partial seams. (Interactive drag-handles on the canvas are deferred — numeric authoring + the 3D
  preview cover the need.)
- **3D consumer** (Leather Studio 3D v0.0.7) clips members to `[t0,t1]`, skips the Tier-1 length +
  Tier-2 gap checks for partial seams, and anchors `align2D` at the chosen end. Contract in
  `SEAM-MODEL.md` §12 + the 3D repo's `SEAM-CONSUMPTION.md` §9.

`saveload` smoke gains partial round-trip + suppressed-hint asserts; full **468/468**, build smoke
**64/64**. Built **saffron-tern-V15**.

---

## v0.8.3 — 2026-06-08

### Folds authoring (Step 6 of 6) — completes the seam plan
The original 6-step seam/assembly plan is now **fully done**. Folds were already reserved in schema
**v15** (`assembly.folds[]` + `normAssembly`), so this is authoring UI only — **no save-format bump**.

- **Fold sub-mode** — the Seam tool gains an **Edges / Fold** toggle (top of the Assembly panel).
  In Fold mode you click **two points on a piece** to drop a crease: 1st click picks the piece under
  the cursor (`hitShape`) + start point, 2nd commits. A rubber-band line + start dot track the cursor;
  **Esc** cancels the in-progress crease. Endpoints snap to nearby anchors/corners (`foldSnapLocal`),
  else grid, and are stored in the piece's **local frame** so the crease rotates with the shape.
  `S.foldMode` / `S.foldDraft` are transient (never saved); commit goes through `pushHist`.
- **Fold data** — `{id, shape, a:{x,y}, b:{x,y}, angle, name}` pushed into `assembly.folds[]`.
  `angle` = **mountain + / valley −** (−180…180), the dihedral the 3D preview will bend about.
- **Canvas** — committed creases render as a **dashed violet** line (`class="seam-aid"` → screen-only,
  stripped from print + SVG/PNG export), each wrapped in its owning piece's transform. All folds show
  in the Seam tool; elsewhere only the panel-selected one, drawn thicker + labelled with its angle.
- **Assembly panel — Folds list/editor** — one row per crease (violet chip, name, owning piece, a
  ⛰/⌄/flat angle badge, **locate ◎** + **delete ✕**, keyboard-activatable). Per-fold editor: name +
  angle. `S.activeFold` highlights the crease on canvas in any tool; cleared on new/load/tab-swap and
  pruned by `validateSeams` when its piece is deleted (undo restores it — folds ride in the snapshot).
- `seam` smoke 43 → **67** (24 new fold asserts: create/draft/reject/select/angle-clamp/rename/list/
  locate/undo-redo/round-trip/prune); full suite **465/465**. Built **russet-marten-V14**.

---

## v0.8.2 — 2026-06-08

### Seam problem hints + Select-tool touchpoint (Step 5 of 6)
Completes Steps 1–5 of the seam plan (only **folds authoring** remains deferred).

- **Length-mismatch hint** — `seamLengthIssues(seam)` flags any member of a 2+-edge join whose edge
  length (`edgeLength`: straight for rects, sampled cubic for paths) is more than **`SEAM_LEN_TOL`
  (1.5 mm)** shorter than the longest member. Surfaced three ways: a **⚠ red strip** in the seam
  editor listing the offending edges + their lengths, **red member rows**, and a **dashed-red overlay**
  on those edges on the canvas (`class="seam-aid"` → still stripped from print/export).
- **Scope decision** — this is the *only* Tier-1 check done in the editor, on purpose: the gap/orphan
  "do the edges actually meet" test needs the pieces **positioned**, and the flat 2D cut layout never
  co-locates them (you draw pieces apart for cutting). So edge-meeting/stacking checks belong to the 3D
  app, not here. (Logged with the 3D auto-stacking TODO — render pieces stacked from seam attachments +
  layer order so the user doesn't pre-overlap patterns.)
- **Select-tool touchpoint** — selecting an edge that belongs to a seam shows a **"Part of seam «name»
  →"** button in the Stitching panel (`goToSeam` → switches to the Seam tool + selects that seam);
  free edges hide it.
- `seam` smoke 37 → **43**; full suite **441/441**. Built **ochre-bittern-V13**. Schema **v15** unchanged.

---

## v0.8.1 — 2026-06-08

### Seam authoring — Assembly panel + per-seam editor (Steps 3–4 of 6)
Builds on v0.8.0's data foundation + Seam tool. The Seam tool is now **end-to-end usable**: create,
name, type, and manage seams. (Remaining: Step 5 Tier-1 problem hints + Select-tool touchpoint, then
folds authoring.)

**Step 3 — Assembly panel.**
- New collapsible **Assembly** `.p-sec` (auto-promoted to an a11y `role=button` header), shown when the
  Seam tool is active or any seam exists. **`createSeamFromSelection()`** groups the pending picks into
  an `assembly.seams[]` entry (`pushHist` → undoable; auto-name "seam N", type stitch), clears the picks
  and selects the new seam. Seam **list** rows: a stable per-seam colour chip (`seamColor` — golden-angle
  hue), name, type badge (✄/⟋/●), member count, and delete (themed `confirmModal`). Rows are focusable
  `role=button` and select/highlight their seam.
- **Canvas overlay**: committed seam member-edges render in the seam's colour with its name label — ALL
  seams in the Seam tool, or just the panel-selected one in other tools. Tagged **`class="seam-aid"`**
  and stripped from print (`@media print`) + SVG/PNG export (`artboardSVGClone`). Clicking a member edge
  in the Seam tool selects its seam. New transient `S.activeSeam` (resets on doc-swap/load; cleared by
  `validateSeams` if its seam is pruned).

**Step 4 — per-seam editor (`seamEditorHTML`).**
- Fields: **name** (unique within the doc, auto-suffixed via `uniqueSeamName`), **type**
  stitch/fold/glue, **order** (assembly step), **allowance** mm (placeholder = `defMargin`).
- **Members** list — each `Shape name · edge N` with **locate** (`locateSeamMember` → Select tool,
  select the shape + highlight the edge) and **remove**; emptying a seam drops it. **Add** the pending
  picks to the open seam (`addPicksToSeam`, skips edges already in a seam).
- Helpers `renameSeam`/`setSeamType`/`setSeamField`/`addPicksToSeam`/`removeSeamMember`. Every edit goes
  through `pushHist` and round-trips in the `.lpd`.
- `seam` smoke feature 11 → **37**; full suite **435/435**. Built **umber-stoat-V12**. Schema **v15**
  unchanged.

---

## v0.8.0 — 2026-06-08

### Seam / assembly model — schema v15 + Seam tool (first cut)
First implementation steps of the seam/assembly model designed in `MD files/SEAM-MODEL.md` (the
Phase-2 gate for the Leather Studio 3D companion). **Steps 1–2 of a 6-step plan** — the data
foundation + edge-selection tool. Grouping picks into named seams (the Assembly panel) is the next
step, so the Seam tool currently *selects* edges but can't yet *create* a seam.

**Step 1 — schema v15 data foundation.**
- New per-document **`S.assembly = {version, seams, folds}`** — added to state, `DOC_KEYS` (so it's
  isolated per tab) and the history **`snapshot()`** (so seam edits will be undoable). Edge refs are
  `{shape:id, edge:int}` — the *same* indexing as per-edge stitching, so the 3D app (which ported the
  stitch kernel) reads them identically.
- **Save bumped v14 → v15.** `buildSaveData()` emits `assembly`; `applyLoadedData()` defaults it empty
  for any pre-v15 file (full back-compat), normalises via `normAssembly`/`normSeam`, then calls
  `validateSeams()`. **`validateSeams()`** prunes members whose shape/edge no longer exist (deleted
  shape, out-of-range path edge, circle = 0 edges), drops emptied seams, prunes dangling folds, rebuilds
  the derived **`S._seamMap`** (`"id:edge" → seam`), and flashes a warning on prune. Runs on load,
  undo/redo, and tab-swap. `seamForEdge(id,edge)` helper.
- Optional per-piece **`sh.thickness`** (mm) — `normShape` keeps only a positive number, else leaves it
  absent so the 3D app falls back to its global thickness.
- Smoke: assembly round-trip (multi-member seam + fold + thickness survive save→load; a 3-member seam
  loses its circle member to validation; a v14 file loads empty), all `version` asserts → 15.

**Step 2 — Seam tool (edge selection across shapes).**
- New **Seam tool** — toolbar `⋈`, key **S** (Shift+S stays snap-toggle). Every shape's edges become
  hoverable/clickable via **`hitAnyEdge`** (skips circles = 0 edges, and hidden/locked pieces). Clicking
  toggles an edge into the pending **`S.seamSel`** list (`toggleSeamPick`/`seamPickIndex`), drawn in
  amber with numbered badges (`edgeMidpoint`); the hovered edge previews in cyan. Each pick is wrapped in
  its own shape transform (picks span multiple shapes). **Esc** clears; switching tools clears.
- `seam` smoke feature (11). Full **409/409**.

Built **scarlet-merlin-V11**. Save schema **v15**.

---

## v0.7.24 — 2026-06-07

### Accessibility: clickable `<div>`s promoted to real controls
Closes the carry-forward a11y item from the v0.7.20 pass — every remaining click-only `<div>`/`<span>`
is now a keyboard-operable, screen-reader-announced control. No save-format change (v14); full smoke
**390/390** (new `a11y` feature, +13).

- **`kbActivate(e)` helper.** Enter or Space fires the element's own `click()`. Guarded by
  `e.target===e.currentTarget`, so a container's handler activates **only when the container itself is
  focused** — a key bubbling up from an inner control (a row's delete button, opacity slider, or tab
  ✕) is ignored, so there's no double-activation. Wired via inline `onkeydown="kbActivate(event)"` on
  dynamically-rendered markup, and `addEventListener` for the static section headers.
- **Promoted controls.** Property-panel **section headers** (`.p-hd` — `role=button` + `tabindex` +
  `aria-controls`/`aria-expanded`, set up in `initAccessibility`; `toggleSection` keeps `aria-expanded`
  in sync), **document tabs**, **artboard rows**, **shape + outline colour swatches**, **layer rows**,
  and **layer-group headers** (`aria-expanded` reflects collapse). Each dynamic template now bakes
  `role="button"` + `tabindex="0"` + the keydown handler + an `aria-label` (swatches especially, since
  they have no text). The global `:focus-visible` ring (v0.7.20) already styles them, so keyboard focus
  is visible everywhere with no extra CSS.
- Menu actions and the tab-close ✕ were already keyboard-accessible (v0.7.20); this fills the gaps.
  **Remaining a11y carry-forward:** `prefers-reduced-motion` (deliberately deferred, low priority).

---

## v0.7.23 — 2026-06-07

### Pen spline-closure + drag-on-resume; stitching QoL
Cleared two "Still wanted" pen items and two stitching/QoL items off the backlog. No save-format
change (schema stays v14); full smoke **377/377** (+18).

- **Spline closure for smooth first/last anchors.** Closing a pen path used to reuse whatever stale
  handles the first/last anchors had, so a smooth loop got a visible kink at the start/close point.
  New `applySmoothClosure(pts)` (called from `finishPen(true)`) recomputes both handles of the first
  and last anchors **when they're smooth** (`!corner`) using a Catmull-Rom tangent (factor 1/6) from
  their cyclic neighbours, giving a tangent-continuous join. Corner anchors are left sharp on purpose;
  an **open** finish never smooths. (+5 asserts in `pen-close`.)
- **Drag-on-resume sets the endpoint's handle.** Resuming an open path (idle pen, click an endpoint)
  was click-only — a drag did nothing. Now a drag on the grabbed endpoint sets *its* outgoing handle
  (cp2 only; the incoming curve is left untouched, so it's purely additive), so the continuation flows
  out smoothly. New `S.penResumeAnchor` flag: armed in `penMouseDown`'s resume branch, applied in a new
  `penMouseMove` branch, cleared in `penMouseUp`/`cancelPen`. (+5 asserts in `pen-resume`; the new test
  also cleans up `S.penResume`, which `reset()` doesn't clear — a latent cross-feature leak.)
- **Settings default-spacing = the per-shape iron-size dropdown.** The Settings ▸ Default spacing field
  was a free numeric input; it's now the same **2.7 / 3.0 / 3.38 / 3.85 / Custom…** dropdown the
  per-shape Spacing uses. Hoisted the preset list to a shared `SPACING_PRESETS` const (was a local in
  `updatePropsPanel`); added `onSettingsSpacingChange` + a `set-spacing-custom` row; `openSettings` /
  `saveSettings` read it the same way `applyProps` does. (+6 asserts in `stitch-inputs`.)
- **Multi-select summary in the properties panel.** With >1 shape selected the panel showed the primary
  shape's single-shape editor (misleading). It now shows a `#multi-sel-msg` summary — "N shapes
  selected", a per-type breakdown, and the combined rotation-aware bounds (`updateMultiSelSummary`,
  using `worldAABB`). (+2 asserts in `multiselect`.)

---

## docs — 2026-06-07

### Repo front door: root README + download link
Added a top-level `README.md` so the GitHub repo page has a real landing experience. Previously there
was no root README and the signed installer only lived as a Release asset, so a first-time visitor had
no obvious "how do I install this" path. The README leads with a **Download** button + version badge
pointing at `releases/latest` (the installer is correctly distributed as a Release asset, not committed
to the repo), documents the expected **SmartScreen "More info -> Run anyway"** step (build is
update-signed, not Authenticode code-signed), notes the in-app/auto-update path, offers the
**browser-only fallback** (download `index.html`, open it), lists feature highlights, and points to
`desktop/README.md` for building from source and `MD files/` for the dev docs. No app/code change; no
version bump.

---

## v0.7.22 — 2026-06-07

### Text boxes: auto-height + per-run bold/italic
Two text-box features off the "Still wanted" list. Both keep `s.text` a plain string, so save/load
and **both** editors (the props textarea + the in-place canvas `<textarea>`) are unchanged.

- **Per-run inline emphasis.** A single box can now mix weights/styles via Markdown-ish markers that
  **toggle** relative to the box baseline: `*italic*`, `**bold**`, `***both***`. New pure helpers
  `parseSegments` (marker scan → styled segments) → `segWords` (measured words, a word may span runs
  like `a**b**`) → **`wrapStyledLines`** (greedy wrap → array of `{t,b,i}` segments per line).
  `wrapTextLines` is now derived from `wrapStyledLines` (markers stripped) so plain line-count and the
  styled render always agree. `renderText` emits **one `<text>` per line with a `<tspan>` per style
  run** (x/y/anchor on the `<text>`, runs flow inline). `measureTextW` gained an `italic` arg.
  In the UI: the **B / I buttons wrap the current textarea selection** in markers when text is
  selected, else toggle the whole-box baseline (unchanged); a hint line documents the syntax.
- **Auto-height (`s.autoGrow`, default off).** When on, the box height tracks its wrapped content
  (top-anchored; valign moot) via `reflowTextHeight(s)`, called at every wrap-changing edit (typing in
  either editor, font-size, width-resize, bold toggle) with `renderText` re-applying it as a safety
  net. Uses a height-independent inset so the size is stable. Resize is **width-only** for auto-height
  boxes — the `n`/`s` mid-handles drop out of `getHandles` and the resize handler ignores vertical drag
  (corners still set width); the in-place editor grows to match. New **Auto-height** checkbox in Text
  props (`toggleAutoGrow`).
- **Schema unchanged** (v14): `autoGrow` is a plain shape field; `normText` backfills it `false` so
  older files default to fixed-height. `makeTextShape` seeds it. HTML smoke **359/359** (+9 text
  asserts: markup→weighted/italic tspans, markers stripped, styled/plain wrap agreement, auto-height
  fit + shrink + handle dropout, round-trip).

---

## v0.7.21 — 2026-06-07

### Finish palette tokenization (single-source the surface/border palette)
Closes the "only text + accent are on CSS variables" carry-forward. Every structural **surface and
border** literal in the dark theme now references a design token instead of a hardcoded hex, so the
whole palette is single-sourced at `:root` (helps the eventual C++ port — one place to read the colours).

- **Dark literals → tokens.** Mapped each hardcoded surface/border to its existing token by exact value
  and role: `#12122a`→`var(--panel)`, `#1e1e38`→`var(--raised)`, `#16162c`→`var(--dialog)`,
  `#0d0d1f`→`var(--canvas)`, `#1a1a2e`→`var(--bg)`, and `#2a2a4a`→`var(--border)` (borders/dividers)
  or `var(--hover)` (hover fills). Covers menubar, tabbar/tabs, toolbar, canvas, props panel + inputs,
  layers arrows, status bar, modal + `.m-inp`, confirm/help/quick-start dialogs, buttons. Because each
  swap is the same value, **dark mode is pixel-identical**.
- **Removed redundant `body.light` overrides.** With the dark rules now on tokens and light re-pointing
  those tokens (`body.light{--panel/…}`), eleven light overrides that merely re-set a role to the value
  the token already provides were dead and are gone (`#menubar`, `#toolbar`, `#props`, `#props-resize`,
  `#status`, `#canvas-wrap`, `.tab`, `.m-item:hover`, `.p-inp/.p-sel`, `.align-cell`, `.modal`) plus the
  redundant `background`/`color` on `body.light` itself. Light mode is unchanged (verified value-by-value).
- **Latent light-mode fix.** The tab-bar scrollbar thumb was a hardcoded `#2a2a4a` with no light override
  (a dark thumb on the light surface); now `var(--border)`, so it follows the theme.
- The only surface/border hexes left in CSS are the **token definitions** themselves. (The dialog-only
  `#2f2f52` border shade is intentionally not a token — a distinct dialog accent used consistently.)

Pure styling refactor — no logic, no save-format change. HTML smoke **350/350**.

---

## v0.7.20 — 2026-06-05  (build maple-osprey-V8)

### Accessibility + UX pass (from the review backlog)
Six items off the UX/a11y backlog (reduced-motion intentionally skipped as low-priority):
- **Visible focus ring.** Global `:focus-visible{outline:2px solid var(--accent-bright);outline-offset:2px}`
  — keyboard focus only (mouse clicks get none); inputs keep their accent-border focus (higher
  specificity, no double ring).
- **System theme default.** `restoreTheme()` follows `prefers-color-scheme` on first run when no theme
  is stored; an explicit toggle still persists and wins.
- **Click-to-open, stay-open menus + keyboard nav** (`initMenubar`). Menubar dropdowns now open on
  **click** via a JS `.open` class (CSS `.m-item.open .m-drop`, hover-open removed) so an accidental
  mouse-out no longer closes them; hovering a sibling switches while open; Esc / outside-click closes.
  Command rows close on click, toggle/checkmark rows stay open. Full keyboard: Enter/Space/↓ open,
  ↑/↓ within, ←/→ between menus, Enter activates, Esc closes.
- **ARIA.** `role=menubar/menu/menuitem` + `aria-haspopup`/`aria-expanded`; `role=toolbar`; icon
  buttons get `aria-label` mirrored from `data-tip` (tooltips were CSS-only); tool buttons get
  `aria-pressed` (synced in `applyToolChrome`); tab close "×" is now a focusable `role=button` with
  label + Enter/Space; new-tab button labeled. Wired by `initAccessibility()` at launch.
- **PNG DPI surfaced at export.** File ▸ Export PNG is now a 150/300/600 DPI group (mirrors Page/Snap
  Size); `exportPNG(dpi)` remembers the choice (`S.pngDPI` + localStorage, in sync with Settings).
- **3-way export-all dialog.** `confirmModal` gained an optional middle button (`opts.alt`): resolves
  OK→true, alt→'alt', Cancel/Esc/backdrop→false (back-compatible). SVG + PNG multi-artboard export now
  offer **All artboards / Active only / Cancel** — Esc no longer silently exports the active artboard.

No save-format change; HTML smoke 350/350. Packaged as **maple-osprey-V8**.

---

## v0.7.19 — 2026-06-05

### Design tokens + colour-contrast fixes (WCAG AA)
Introduced a CSS custom-property token system (`:root` = dark default; `body.light` re-points the
tokens) as the single source of truth for the palette: surfaces (`--bg/--canvas/--panel/--raised/
--dialog/--hover/--border/--border-soft`), **text tiers** (`--text/--text-2/--text-muted/--text-faint/
--text-heading`), accent (`--accent/--accent-bright/--accent-hover/--accent-soft`), and semantic/canvas
(`--success/--drop/--shape/--stitch`). All text roles across menubar, props panel, layers, status bar,
tabs, toolbar, settings modal, home, help and quick-start now use the text-tier tokens, so a single
light token override fixes every role in both themes — and ~25 redundant per-selector `body.light`
colour overrides were removed. **Contrast:** every text tier now meets AA (≥4.5:1) on its worst-case
surface in both themes (dark 5.0–9.5:1; light 5.3–8.3:1), up from failures as low as 1.86:1 (light
keyboard hints) and 2.2–2.5:1 (dark notes/hints). Two judgment calls included: button **hover** fills
now use `--accent-hover` `#cf3a28` (white text 4.9:1, was 3.8:1 on `#e74c3c`); the **stitch** colour on
the light canvas darkens to `#b5640f` (4.2:1, was 2.8:1) via the `--stitch` token — **print is
untouched** (it forces black via `@media print !important`). No JS/logic change; HTML smoke 350/350.
Full before/after audit in `STYLE_GUIDE.md` §8. Structural a11y + UX findings logged to the backlog
above (keyboard menus, focusable controls, focus rings, ARIA, reduced-motion).

---

## 2026-06-05 — UX + accessibility review (docs only, no app change)

Ran a UX flow check + WCAG contrast audit and wrote **`STYLE_GUIDE.md`** (root) — human-facing
palette/type/spacing/components reference plus the full contrast audit (§8) and structural a11y notes
(§9). No version bump (nothing in `index.html` changed). Key contrast failures found (measured sRGB):
dark `#555` notes/`.kb` hints (2.2–2.5:1), `#666` status bar (3.2), `#777` muted labels (4.1),
`#6c6c92` group heading (3.7); and a **systematic light-theme** problem — the secondary greys
(`#888`/`#999`/`#aaa`, group heading) were carried over from dark and fail on the light chrome
(1.9–2.8:1), plus stitch orange on the light canvas dips to 2.8 (<3:1). Suggested passing replacements
are tabulated in the style guide. Structural: menus are hover-only (no keyboard open), ~21 clickable
`<div>`s aren't focusable, `outline:none` removes some focus rings, almost no ARIA, no
`prefers-reduced-motion`. _Fixes not yet applied — awaiting go-ahead._

---

## v0.7.18 — 2026-06-05

### PNG export (alongside SVG)
New **File ▸ Export PNG**. Reuses the SVG export pipeline: same all-artboards / active-only flow,
same per-artboard region framing — then rasterises each region to PNG. `svgToPngBlob(svg,wMM,hMM,dpi)`
loads the self-contained export SVG through a blob URL into an `<Image>`, draws it onto a 2D canvas
sized `mm→px = dpi/25.4` over a white background (matches print; PNG would otherwise be transparent),
and `toBlob('image/png')`. `buildSVGExports` now also returns `stem` + `w`/`h` per entry so the
rasteriser can size the canvas (SVG/name fields unchanged; smoke unaffected). **DPI is a setting** —
Settings ▸ Export ▸ PNG resolution (150 draft / 300 print / 600 high, default 300), `S.pngDPI`,
persisted to `localStorage['lpat-png-dpi']` (a UI pref — *not* in the `.lpd` schema, no version bump).
Desktop routes through `exportPNGNative` (folder picker for "all", native Save dialog for one), which
writes **binary** via a new Rust command **`save_file_bytes(path, Vec<u8>)`** — PNG can't ride the
JSON-string `save_file`. Browser uses FS-Access `saveBlob` / `downloadBlob`. Both degrade to a download
if the dialog plugin is absent. Build smoke +6 asserts (`save_file_bytes` define/register/invoke,
`exportPNG`/`exportPNGNative`/`svgToPngBlob` present, exportPNG desktop branch) → 57/57; HTML smoke +1
(export entries carry stem/w/h) → 350/350. _Desktop binary write is build-only until the next `/build`
(the new Rust command ships then); browser PNG export works now. Note: bytes are passed as a number
array — fine for typical pattern sizes; revisit with raw `ArrayBuffer` IPC if large high-DPI exports
feel slow._

---

## v0.7.17 — 2026-06-05

### Desktop SVG export through the native save dialog
SVG export now routes through Tauri on the desktop build instead of the browser download/FS-Access
path — the last file-IO operation that still bypassed native IO. New helper `exportSVGNative(out, all)`:
a **single** artboard opens a native Save dialog (`.svg` filter) and writes via the existing generic
`save_file` Rust command (the same fs wrapper `.lpd` saves use — no new Rust command, no Cargo/conf
change beyond the version bump); **all artboards** opens a directory picker and writes each file into
the chosen folder (`dir+'/'+name`; Windows `std::fs` accepts `/`). Both degrade to a browser download
if the dialog plugin global is absent, so export always produces a file. `exportSVG` gains one
desktop branch (`if(isDesktop()){ await exportSVGNative(out, all); return; }`) right after it builds
the export set and restores the live view; the browser `saveBlob`/`downloadBlob` paths are untouched.
Build smoke +2 asserts (`exportSVGNative` present + `exportSVG` desktop branch) → 51/51; HTML smoke
349/349 (the export branch is inert without `__TAURI__`). No save-format change.

---

## v0.7.16 — 2026-06-05

### Right panel reorder
Moved the contextual panels to the top: **Shape Properties → Stitching → Pen hints → Layers →
Artboards** (was Layers/Artboards first). The selected-shape + active-tool controls are now at eye
level; the structural lists sit below. Pure markup move in `#props` — section IDs unchanged, so all
toggle/render JS is unaffected (panel features 106/106).

### Auto-update: silent check on launch
The desktop app now quietly checks for updates ~1.5s after launch and only surfaces the prompt when a
newer version exists — otherwise it starts normally. Reduces friction for users who never click the
button. One line in init: `if(isDesktop()) setTimeout(()=>checkForUpdates(false), 1500)`. Reuses the
existing `checkForUpdates(false)` (manual=false), which already stays silent when up to date, offline,
or in a plain browser (no `__TAURI__`), and shows the themed "Update Available" confirm only when there
is one. The Help ▸ Check for Updates menu (manual=true) still gives the explicit "you're on the latest
version" feedback. Build smoke +1 assert (49/49); HTML smoke 349/349 (inert without `__TAURI__`).

---

## v0.7.15 — 2026-06-05

### Auto-update live verification release
Version-only bump released through the GitHub Actions pipeline to prove the end-to-end updater: an
installed **v0.7.14** sees this release via `latest.json`, downloads the signed installer, verifies it
against the embedded public key, installs, and relaunches as **v0.7.15**. No functional change — the
welcome-screen version string is the visible confirmation. First release delivered to a real install
by the auto-updater. Build smoke 48/48, HTML smoke 349/349 unchanged.

---

## v0.7.14 — 2026-06-05

### Auto-update — in-app "Check for Updates" (desktop)
The installed desktop app can now update itself from GitHub Releases — no reinstall. Built on the
official **`tauri-plugin-updater`** (signed updates), not a hand-rolled version scrape.

- **Repo:** the project root is now a Git repo pushed to **`soulagent/leather-pattern-designer`**
  (public; only soulagent can push). `.gitignore` excludes the 3 GB `target/`, `gen/`, generated
  `dist/`, build logs, temp test files, `si-test.lpd`, and `.claude/settings.local.json`.
- **Signing:** `cargo tauri signer generate` → keypair stored in `~/.tauri/` (outside the repo).
  Public key in `tauri.conf.json plugins.updater.pubkey`; private key + password in GitHub Actions
  secrets `TAURI_SIGNING_PRIVATE_KEY` / `..._PASSWORD`.
- **Rust:** added `tauri-plugin-updater` (`Builder::new().build()`) + `tauri-plugin-process` (relaunch),
  capabilities `updater:default` + `process:default`, and **`serde_json`** as a direct dep (the updater
  config makes `generate_context!` reference it — without it, `cannot find serde_json` at compile).
  `bundle.createUpdaterArtifacts:true` emits the `.sig` + `latest.json`. Endpoint:
  `…/releases/latest/download/latest.json`.
- **Frontend:** Help ▸ **Check for Updates…** (`#mi-update`, hidden in the browser build) →
  `checkForUpdates(manual)`: `window.__TAURI__.updater.check()` → themed confirm with the new version +
  notes → `downloadAndInstall()` with a live % flash → `process.relaunch()`. Feature-detected behind
  `window.__TAURI__`; a complete no-op in a plain browser.
- **Release pipeline:** `.github/workflows/release.yml` (GitHub Actions) on `workflow_dispatch` or a
  `v*` tag — `tauri-apps/tauri-action` builds the NSIS installer, signs it, creates the Release, and
  uploads installer + `.sig` + `latest.json`. Releasing = bump version → push → run the workflow.
- **Tests:** build smoke gains 15 updater asserts (plugins/caps/config/pubkey/endpoint + frontend
  flow) → **48/48**. HTML smoke unaffected → **349/349** (the update flow is inert without `__TAURI__`).
- **Caveat:** only the **installed** app updates (the dev `target/release` exe and the browser build
  don't). On Windows, an update = download + run the new signed NSIS installer (not a binary diff).

---

## v0.7.13 — 2026-06-05

### Multi-file tabs — several open `.lpd` documents at once
A tab strip under the menu bar; each tab is an independent document with its own shapes, undo
history, artboards, view (pan/zoom), selection, file binding, and stitch/snap settings.

- **Architecture — "active doc lives in `S`, inactive docs hold a stash":** rather than rewrite
  hundreds of `S.shapes`/`S.hist`/… references into `S.docs[active].…`, the active document stays
  directly in `S` (so every existing function operates on it unchanged). Inactive documents are
  parked as a `.doc` stash on their tab. `switchTab(i)` captures the per-document slice out of `S`
  into the outgoing tab (`captureDoc()`), then applies the incoming tab's slice back (`applyDoc()`).
  Capture is **shallow** — inactive tabs are never mutated, so parked references stay isolated.
  `DOC_KEYS` defines the slice: `shapes, nextId, hist, future, pan, zoom, artboards, activeArtboard,
  nextArtboardId, selArtboard, layerCollapsed, fileHandle, nativePath` + the file-saved settings
  (`defMargin, defSpacing, stitchStyle, histLimit, snapMM, snapShapes, rotStep, dimFontSize, labelMM,
  autoSaveInt`); `selIds` captured separately (it lives behind a getter). Tool, theme, transient
  drag/pen/hover state, and view toggles stay **global** in `S`.
- **State ops:** `blankDoc()` (fresh doc inheriting current defaults + page preset), `newTab()`,
  `openDocInTab(data, binding)` (reuses a pristine-empty active tab, else opens a new one), `closeTab(i)`
  (confirms only if that tab has shapes; closing the last tab leaves one fresh blank doc; index
  juggling done by object identity so it's robust), `afterDocSwap()` (shared post-swap refresh:
  applyPageDims + menus + renderContent + history + renderTabs).
- **UI:** `#tabbar` strip (HTML between menubar and `#main`), `renderTabs()`, click-to-switch, per-tab
  ✕ close, a `+` new-tab button. Light/dark themed, hidden in print. Tab title = bound file name, else
  the doc/artboard name; refreshed after a save (folded into `flashSaved`).
- **Wiring:** New = a fresh tab (no discard — nothing is lost); Open / Open-recent / native Open /
  launch-open / autosave-recover all route through `openDocInTab` (reuse the pristine launch tab,
  else new tab); the desktop **single-instance** 2nd-file now opens in a **new tab** (no discard
  prompt). Save/Save-As act on the active doc as before. Shortcuts: **Ctrl+T** new tab, **Ctrl+W**
  close tab, **Ctrl+Tab / Ctrl+Shift+Tab** cycle (work in the desktop app; browsers reserve them).
- **Save format unchanged (v14)** — a tab is just a loaded document; no per-file schema change.
- **Known limitation:** auto-save still snapshots only the **active** document (single `lpat-autosave`
  slot). Background tabs aren't auto-saved. Acceptable for v1; noted for a future per-doc autosave.
- **Tests:** new **`tabs`** smoke feature (13 asserts: state isolation across switch, per-tab history,
  background close, `openDocInTab`, last-tab reset). **349/349** full. `reset()` in the harness now
  collapses to a single tab so leftover tab state can't leak between features. Build smoke updated:
  dropped the bogus `devVersion==APP_VERSION` assert and made exe-currency an informational note
  (it's expected stale mid-dev). **33/33** build smoke.

---

## v0.7.12 — 2026-06-05

### Desktop: native save-back + native Open/Save-As dialogs (closes D1) + single-instance (closes D2)
Finishes the open/save loop started in v0.7.11. In the packaged app, **Ctrl+S now writes back to the
opened `.lpd` on disk** instead of downloading a copy; New/Open/Save-As use **native OS dialogs**; and a
2nd `.lpd` double-click now **loads into the running window** rather than spawning a 2nd one.

- **Rust (`src-tauri/main.rs`):** `LaunchFile` now holds the launch **path** (not the contents).
  `take_launch_file` reads the file and returns `[path, contents]` (a tuple → JSON array) so the
  frontend can both load it *and* remember where to save back. Two new commands: `read_file(path)`
  and `save_file(path, contents)`, both thin `std::fs` wrappers returning `Result<_, String>`.
  Registered alongside `take_launch_file`.
- **Plugin:** added **`tauri-plugin-dialog`** (`Cargo.toml` + `.plugin(tauri_plugin_dialog::init())`
  + `"dialog:default"` in `capabilities/default.json`) for the native Save/Open pickers. Exposed to
  the no-bundler frontend via the existing `withGlobalTauri` as `window.__TAURI__.dialog`.
- **Frontend (`index.html`):** new `S.nativePath` (absolute path of the open `.lpd`, mirrors how
  `S.fileHandle` is tracked — set on launch-open / native Open / Save-As; cleared in
  `newFile`/`loadFile`/`openRecent`). A small native-IO helper layer: `isDesktop()`/`tauriInvoke()`,
  `tauriPickSavePath`/`tauriPickOpenPath` (dialogs), `saveFileNative(forceDialog)` and
  `triggerLoadNative()`. `saveFile`/`saveFileAs`/`triggerLoad` each get a one-line `if(isDesktop())`
  branch at the top; the **browser File System Access API + download paths are byte-for-byte
  unchanged**. Every helper degrades gracefully — if the dialog global is somehow absent, save-back
  to a known path still works and a brand-new doc falls back to a download.
- **Single-instance (D2):** added **`tauri-plugin-single-instance`** (registered **first**, as required).
  Its callback runs in the already-running app: `app.get_webview_window("main").set_focus()`, then if the
  2nd launch's argv has a `.lpd`, read it and `win.emit("open-lpd", (path, content))` (needs
  `use tauri::{Emitter, Manager}`). Frontend `listenForSecondInstance()` (init, after `openTauriLaunchFile`)
  subscribes via `window.__TAURI__.event.listen('open-lpd', …)` → `onSecondInstanceFile(path, content)`,
  which **confirms a discard** (via `confirmModal`) when the current pattern has shapes, then
  `applyLoadedData` + sets `S.nativePath`. No frontend capability needed (`core:default` already permits
  event listen). Inert in a plain browser (no `__TAURI__.event`).
- **Verification:** browser smoke **336/336** (the harness has no `window.__TAURI__`, so it exercises
  the untouched browser paths). Built **cedar-otter-V6** (`cargo tauri build`, exit 0) and confirmed in
  the packaged exe: **save-back writes in place** (no download), **native Save/Open dialogs** appear, and
  a 2nd `.lpd` launch **does not spawn a 2nd process** (single-instance) — verified at the process level
  (`Start-Process exe -ArgumentList file` left exactly one running instance) and it loaded into the
  existing window.
- **New: `tests/run-build-smoke.ps1`** — a **second, independent smoke target** for the desktop build,
  separate from the headless-Edge HTML logic smoke. Static + fast (~1s, no browser, no exe run): checks
  the Rust<->JS contract (each Tauri command is defined+registered in `main.rs` AND invoked in
  `index.html`; the `open-lpd` event name matches on both sides), that the plugins + `dialog:default`
  capability + `withGlobalTauri` + `.lpd` association are declared, that all the frontend helpers/branches
  exist, and that every version string is in sync (APP_VERSION == Cargo.toml == tauri.conf == build-info).
  `-Compile` adds a real `cargo check`. **37/37** with `-Compile`. This is the only check that catches a
  renamed command / mismatched event / version drift before shipping a build.
- **Double-click `.lpd` needs a native install:** the file association is a registry entry written by the
  **NSIS installer** (`...setup.exe`); the standalone `target/release` dev exe is never registered, so
  double-click has nothing to route to (the launch-arg *code* works — proven via `Start-Process`). Run the
  setup.exe once to get double-click (it points at the *installed* copy, not the dev build). Deferred by
  the user.

---

## v0.7.11 — 2026-06-05

### Desktop: open `.lpd` on double-click (launch-argument handling)
Completes the file-association loop from v0.7.10 — double-clicking a `.lpd` now **opens it in the app**
(cold start).

- **Rust (`src-tauri/main.rs`):** `read_launch_file()` scans argv for a `*.lpd` path (the association
  registers the open command as `"...exe" "%1"`, so the path is argv[1]) and `std::fs::read_to_string`s
  it. The contents go into a managed `LaunchFile(Mutex<Option<String>>)`; the `take_launch_file` command
  hands them to the frontend once (and clears them). Registered via `.manage(...)` +
  `.invoke_handler(generate_handler![take_launch_file])`. No extra plugins.
- **Config:** `tauri.conf.json` gains `app.withGlobalTauri: true` so the no-build single-file frontend
  can call `window.__TAURI__.core.invoke('take_launch_file')` without a bundler.
- **Frontend:** `openTauriLaunchFile()` (called at the end of init, right after `showHome()`) invokes the
  command; on content it `applyLoadedData(JSON.parse(...))` + `hideHome()`. Guarded on `window.__TAURI__`
  → a complete **no-op in a plain browser**, so the standalone HTML build is untouched. Smoke
  (core/home/saveload/help) green — the loader is inert in headless Edge.
- **Known gaps (noted in CONTEXT D2):** (1) **save-back is not wired** — Ctrl+S in the packaged app still
  downloads a copy (native Tauri *save* is the separate D1 task), so an opened file is effectively
  read-only on disk; (2) **no single-instance** — opening a 2nd `.lpd` while running spawns a 2nd window.

---

## v0.7.10 — 2026-06-05

### Tauri `.lpd` file association + safe codebase cleanup (pre-build)

**Tauri file association.** Added `bundle.fileAssociations` (`ext: ["lpd"]`, name
`LeatherPatternDocument`, role Editor) to `desktop/src-tauri/tauri.conf.json`, so the NSIS installer
registers `.lpd` with the app (icon + "Opens with"). **Caveat:** double-click-to-open still needs the
deferred native-file-IO work (read the launch arg in `main.rs` → hand the path to the frontend) — the
association only registers the type for now. Noted in CONTEXT D2.

**Safe cleanup pass** (behavior-preserving — verified by the full 336-assert smoke suite, no functional
change). Survey first found the code already clean: **no dead functions, no unused constants**. Applied:
- `applyToolChrome(t)` — factored the toolbar-highlight / cursor-class / status-text / pen-hints
  update shared (and previously duplicated) between `setTool` and `cancelPen`. `cancelPen` still can't
  call `setTool` (that nulls `S.selId` and would deselect the just-finished path); it now reuses just
  the chrome helper.
- `clone(o)` — one named deep-clone helper replacing 10 inline `JSON.parse(JSON.stringify(...))` sites
  (copies + pre-edit history snapshots).
- `setMenuCheck(id,on)` — centralised the View-menu `✓`/blank glyph convention (grid/page/rulers/snap),
  with a defensive null-guard the inline versions lacked.
- _Deliberately skipped:_ a mass `N/(S.zoom*PX)` → `px(N)` substitution (~70 sites) — high churn,
  weakly covered by tests (visual pixel sizes aren't asserted), and float-reassociation-sensitive;
  not worth the risk right before a build.

No save-format change. Full **336/336**.

---

## v0.7.9 — 2026-06-05

### Rename native save format `.lpat` → `.lpd`
Branding: the native document is now **`.lpd`** ("Leather Pattern Document"). Clean swap — per the
user, **no `.lpat` loading is retained** (they're deleting their old files), so this is a pure rename.

- All file-extension touch points updated: the Save-picker types (`LPAT_TYPES` → `LPD_TYPES`,
  description "Leather Pattern Document"), `lpatBlob` → `lpdBlob`, `docName()+'.lpd'` (Save As +
  download fallback), the fallback `<input accept>` (`.lpd,.json`), and all UI copy (File menu Save/
  Open labels, Help rows, the "clear cache" note, the in-app prose).
- **JSON schema unchanged** (still version 14) — only the wrapper extension changed; `buildSaveData`/
  `applyLoadedData` and the older-schema defaulting/migration are untouched.
- **Internal browser-storage keys keep their `lpat-` prefix on purpose** (`lpat-recents`,
  `lpat-autosave`, `lpat-theme`, `lpat-props-w`) so existing recents / autosave / theme / panel-width
  state isn't wiped by the rename. (They're invisible namespacing, not file names.)
- No logic change → no new asserts; existing save/load round-trip stays green (**336/336**).

---

## v0.7.8 — 2026-06-05

### Pen-tool polish, round 2: placement ghost + resume an open path

**Placement ghost.** The pen now draws a high-contrast **magenta crosshair + square + centre dot**
at the exact spot the next click will land, so grid-snapped placement is unambiguous (the crosshair
arms grow while snapping). `penGhostMarker(cur)`; rendered whenever the pen tool is idle (the render
gate changed from `S.penPts.length>0` to `S.tool==='pen'`, so the ghost shows even before the first
point). Suppressed while dragging a handle, while closing, or while hovering a resume target.

**Resume an open path.** Hovering the **endpoint of an existing open path** with the idle pen shows a
cyan ring cue ("Resume open path"); clicking continues drawing from that end.
- `penResumeTarget(mm)` → `{id, end:'first'|'last'}` for an un-rotated, unlocked, unhidden open path
  whose first/last anchor is within `PEN_CLOSE_PX`. (Rotated paths are skipped — their points live in
  a rotated local frame the live world-coord placement can't match.)
- `resumeOpenPath(id,end)` lifts the shape's points into `S.penPts` (reversing via `reversePenPts`,
  which swaps each anchor's cp1/cp2, when resuming from the *first* end) and pulls the shape out of
  the document, stashing it in `S.penResume`. `finishPen` re-adds it **keeping the original id +
  props**, pushing one undo entry whose target is the original open path (so a single undo reverts
  the whole resume). `cancelPen` / tool-switch restore the lifted shape via `discardPenResume()`.
- Wired into `penMouseDown` (idle + no points → resume if hovering an endpoint).
- `pen-resume` smoke feature (22: target detection, reverse, lift/finish/undo, first-end reversal,
  cancel-restore, ghost + resume-cue render). Toolbar Pen panel + Help + SHORTCUTS updated. No
  save-format change. Full **336/336**.

---

## v0.7.7 — 2026-06-05

### Pen-tool polish: close cue + Backspace point-undo
User-flagged pen friction (the pen is expected to be the most-used tool):

- **Close-loop cue (Illustrator-style).** As the cursor nears the first anchor of a closable path
  (≥2 points), a **green ring** wraps the first anchor, a small floating **○** rides by the cursor,
  the dashed preview **snaps to the first anchor** (turns green), and the tooltip collapses to
  **"Click to close path."** Shared geometry: `PEN_CLOSE_PX = 8` + `penCloseHit(mm)` (cursor within
  range of the first anchor) and `penClosing()` (tool=pen, not mid-drag, hovering in range). The
  mousedown close test now calls `penCloseHit` too, so the cue's presence guarantees the click
  closes. `renderPenInProgress` emits a `.pen-close-cue` circle while closing.
- **`Backspace` undoes the last placed anchor** — `penUndoPoint()` pops the last pen point and is
  wired **only** when `S.tool==='pen' && S.penPts.length` (with `preventDefault`), so it rewinds
  in-progress anchors without ever touching the document undo/redo stack. The `Delete`/`Backspace`
  key case was split so plain `Delete` still deletes the selection. Removing the last anchor just
  empties the in-progress path.
- Toolbar Pen panel + Help overlay + SHORTCUTS updated (close cue, `Backspace` = undo point). No
  save-format change. `pen-close` smoke feature (15). Full **314/314**.

---

## v0.7.6 — 2026-06-04

### Alt-drag duplicate-and-move + Quick Start (FTUE)

**Alt-drag to duplicate-and-move (Select tool).** Holding <kbd>Alt</kbd> as you start dragging a
shape (or multi-selection) clones the selection in place and drags the **copies**, leaving the
originals put — the Figma/Illustrator gesture.
- New helpers `altDuplicateInPlace(primaryId)` (clones the selected ids in place, captures a
  **pre-duplicate** snapshot for one undo entry, swaps the selection to the copies, returns the
  clone of the primary so the existing move setup tracks it) and `finishAltDuplicate(moved)`
  (on release: `moved` → commit the single undo entry covering copy+move; not moved, i.e. a pure
  alt-click → drop the stacked copies and restore the originals' selection, a no-op).
- Wired into `onDown` (the plain-move branch: `if(e.altKey) id=altDuplicateInPlace(id)`) and `onUp`
  (an `altDup` branch before the normal move-commit). Works on multi-select and rotated shapes; no
  save-format change. `duplicate` smoke +11.

**Quick Start overlay (`#qs-bg`).** A dedicated, lightweight first-time walkthrough — four
illustrated steps (draw a piece → select & shape → add saddle stitching → print at true scale),
each with a small inline-SVG illustration, plus a footer note pointing at text/artboards/layers, an
**"Open full Help →"** handoff (`quickStartToHelp`), and a "Got it" close.
- Opened from a new **"First time here?"** entry on the welcome screen (`.home-firsttime` →
  `openQuickStart`). `openQuickStart`/`closeQuickStart`/`isQuickStartOpen` mirror the help overlay;
  Esc + backdrop close. The key handler gives the overlay keyboard ownership **before** the Home
  gate (it's usually opened from Home). Light/dark aware; hidden in print.
- **FTUE upkeep:** the Quick Start is now treated as a living doc — refresh it when a headline
  feature changes (see the FTUE section in the backlog). `quickstart` smoke feature (8).
- Full **299/299**.

---

## v0.7.5 — 2026-06-04

### Per-layer hide / lock
The last open Layers-panel follow-up: each layer row gains a **visibility (eye)** and **lock**
toggle, left of the ▲/▼ reorder buttons (inline SVG icons, `currentColor` so themes + active
states recolour them).

- **Two new shape flags** `hidden` / `locked` (both absent/false by default).
  - **Hidden**: not drawn (`renderContent` skips it → so it doesn't print either), not hit-tested
    (`hitShape`), not marquee-picked (`shapesInBand`), and not a snap target (`computeSnap`). The
    eye icon shows open (visible) / slashed (hidden); a hidden row dims its swatch + name.
  - **Locked**: still drawn (stays visible) but not selectable on canvas, not movable/resizable,
    and not marquee-picked — `hitShape` + `shapesInBand` skip it. (Snapping still treats locked
    shapes as valid alignment targets.) The lock icon shows open / closed (closed tints orange).
- `toggleLayerHidden` / `toggleLayerLocked` push history, flip the flag, and **deselect the shape**
  if it was selected (no stale handles on a hidden/locked shape). `selectLayer` refuses to select a
  hidden or locked layer (toggle it back via the row icons). Shared `deselectShape(id)` helper.
- **Save bumped v13→v14**: `hidden`/`locked` are plain shape fields, so they ride save/load as-is;
  new `normShape(s)` coerces both to bool on load (calls `normText`) so **v1–v13 files default to
  false**. `applyLoadedData` now maps shapes through `normShape`.
- `layers` smoke +15 (hide skips render/hit/marquee, lock stays rendered but unhittable, deselect
  on toggle, v14 round-trip, `normShape` backfill). Two existing asserts updated to v14; the
  geometry round-trip now normalises the source first. Full **280/280**.

---

## v0.7.4 — 2026-06-03

### Export all artboards
Last artboards follow-up: export every page in one action, not just the active one.

- **Export SVG** now checks the artboard count. With **one** artboard it behaves as before (save
  picker). With **several**, a themed dialog asks **"All artboards / Active only"**. *All* writes one
  SVG per artboard — each clipped to its page at true mm scale — via direct download (`downloadBlob`),
  because a save picker per file would consume the click's transient activation and block after the
  first. A status-bar flash confirms ("Exported N SVGs ✓").
- Helpers: `svgStringFor(ab)` (serialised SVG for one artboard), `buildSVGExports(all)` → `[{name,svg}]`
  with **de-duped filenames** (`Untitled`, `Untitled-2`, …) from `abFileStem`. `exportSVG` is now async
  (awaits the dialog), renders once at pan0/zoom1, builds the set, restores the live view, then saves.
- `artboards` smoke +4 (all → one entry per artboard; active → one; filenames distinct; each svg
  framed to its own region). Full **265/265**.

---

## v0.7.3 — 2026-06-03

### Artboard geometry on the undo stack
Follow-up: add / move / delete artboard now undo and redo like any shape edit, so undo behaves as expected.

- The history **snapshot now serializes `{shapes, artboards, active}`** (was a bare shapes array).
  `snapshot(shapes=S.shapes, artboards=S.artboards, active=S.activeArtboard)` and `restoreHist` set &
  **clamp** all three on restore — an invalid `activeArtboard`/`selArtboard` is fixed up and
  `nextArtboardId` kept ahead of the restored ids. All existing `snapshot(S.shapes)` call sites keep
  working (artboards/active default to current), so text-edit / opacity / group-move history is
  unchanged.
- `addArtboard` and `deleteArtboard` `pushHist()` before mutating. An artboard **move** captures a
  pre-drag snapshot (`S.movingArtboard.snap`) on mouse-down and commits one undo entry on release only
  if it actually moved (a plain select-click adds nothing).
- `artboards` smoke +7 (undo removes an add / redo restores it; move → undo restores position;
  delete → undo restores the artboard). Full **261/261**.

---

## v0.7.2 — 2026-06-03

### Layers panel grouped by artboard
Follow-up (2): the Layers panel now reflects the artboard structure.

- **Grouping**: shapes nest under collapsible **artboard group headers**; a shape's group is
  **positional** — `shapeArtboardId(s)` returns the top-most artboard whose rect contains the shape's
  centre, else `null` → a "Not on an artboard" section. Each header shows the artboard name (● if
  active) + a member count; clicking it toggles collapse (`S.layerCollapsed`, `toggleLayerGroup`).
- **Simple case stays simple**: when there's only one section (a single artboard holding every shape,
  no unplaced ones), the list renders **flat with no header** — exactly like before.
- **Group-aware reorder**: ▲/▼ (`reorderLayer`) now swap a shape with its nearest **same-artboard**
  neighbour in the z-direction (skipping shapes on other artboards), and drag-reorder **rejects
  cross-group drops** (`layDrop` checks `shapeArtboardId` match) — membership is positional, so you
  reposition the shape to change its group, not drag it in the panel. Within a group it's the old
  z-order reorder. Row markup factored out into `layerRowHTML`.
- `layer-groups` smoke feature (7 asserts: membership mapping, unplaced, header-per-group, row count,
  collapse hides rows, group-aware raise skips other artboards, single-section flat). Full **254/254**.

---

## v0.7.1 — 2026-06-03

### Multi-page print / export per artboard
Follow-up (1) to the artboards feature: Print and Export now respect every artboard.

- **Print** (`printPattern`) emits **one sheet per artboard**, each at true mm scale. It renders the
  scene once at pan=0/zoom=1 (so the vp group maps world-mm → mm via `scale(PX)`), then
  `buildPrintPages()` clones the live `#cvs` once per artboard into a hidden `#print-root`; each
  `.print-page` is framed by a `viewBox` over that artboard's region and an mm-sized box, paired with a
  named `@page abpN { size: w h; margin:0 }` (Chromium named pages → correct per-artboard paper size).
  A temporary print stylesheet hides the live UI (`#menubar,#main,#status,#home,…`) and shows only the
  pages; the single-page `@page` rule is suppressed for the duration. Torn down + live view restored
  after the dialog.
- **Export SVG** (`exportSVG`) now exports the **active artboard's** region (clipped, true scale) — a
  clean "one artboard = one file" model; switch the active artboard and re-export for the others.
  (Batch "export every artboard at once" is a possible later tweak.)
- Shared helper **`artboardSVGClone(ab)`** frames a clone to one artboard and strips the screen-only
  aids. The page outline now carries **`.artboard-rect` / `.artboard-label`** classes — hidden in
  `@media print` and removed from SVG exports, so patterns come out clean (no dashed page border).
- `artboards` smoke +7 (page-per-artboard count, named `@page` count, mm box size, region viewBox,
  aid-stripping, export viewBox/strip). Print/export are exercised via the extracted builders without
  invoking `window.print()`. Full **247/247**.

---

## v0.7.0 — 2026-06-03

### Multiple artboards — first cut (save format v13)
The single page becomes many. Lay out several pages on the infinite canvas; each is its own
print/export region. Built in stages — this is stage (a); print/export + layer-grouping are follow-ups.

- **Data model**: `S.artboards[]` (each `{id,name,preset,orient,w,h,x,y}`, x/y = top-left in mm) +
  `S.activeArtboard` / `S.nextArtboardId`. **`S.page` is now a getter** that returns the active
  artboard, so every existing page consumer (View menu, Settings ▸ Page, `applyPageDims`,
  `updatePrintPageSize`, `docName`, save) transparently reads/edits the active one — minimal churn.
- **Artboard tool** (toolbar ⛶, key **A**): click an artboard to select + make it active, drag to
  reposition (`snapV`, Shift-snap). Shapes are never touched by this tool, so they can't be nudged
  while arranging pages. `Del` removes the selected artboard (always keeps ≥1). Artboards render
  even with the page boundary off while this tool is active.
- **Artboards panel** (right side, under Layers): `renderArtboards()` lists them (● = active), click
  to select, **+ Add Artboard** drops a new page to the right of the rightmost, ✕ deletes.
- **Render**: `renderContent` loops `S.artboards`, drawing each rect+label at its offset; the active
  one gets a subtler highlight, the tool-selected one a red outline. `getFitBox()` (shapes + all
  artboards) feeds Fit-All so pages frame even with no shapes; **`getBBox` stays shapes-only** (its
  contract). Print pans to the active artboard's offset (was hard-coded 0,0).
- **Save v13 + migration**: `buildSaveData` writes `artboards` + `activeArtboard`; `applyLoadedData`
  restores them, and **migrates v1-12 files** by wrapping their single `settings.page` as
  `artboards[0]` at origin (`normArtboard` backfills). `newFile` resets to one default artboard.
- **Known limits (this cut)**: artboard geometry changes aren't in the shape undo stack yet; print/
  export is still single-region. Both tracked as follow-ups.
- `artboards` smoke feature (18 asserts: model, add/select/delete, hit-test, v13 round-trip,
  migration). `saveload`/`text` version asserts bumped to 13; harness `reset()` resets artboards and
  swaps the two `S.page = {…}` assignments to `Object.assign` (the getter is read-only). Full **240/240**.

---

## v0.6.3 — 2026-06-03

### In-app help overlay (`?`)
A self-contained Help & Keyboard Reference, so the app explains itself without leaving the window.

- **Overlay** `#help-bg`/`.help-panel` (`openHelp`/`closeHelp`/`isHelpOpen`/`toggleHelp`). Opened by
  the **`?` key** from anywhere on the canvas, or the **? button pinned to the bottom of the toolbar**
  (`#tb-help`, `margin-top:auto`). It **owns the keyboard while open** — a dedicated branch at the top
  of the global keydown handler (mirroring the confirm-dialog branch) closes on `Esc` or `?` and
  swallows everything else; backdrop click also closes.
- **Content**: a scrollable card laid out in responsive columns (CSS `column-width:330px`, sections
  `break-inside:avoid`). Tool list, File/Edit/View shortcut tables (`kbd.k` key chips), Select / Pen /
  Text / Rotate cheat-sheets, plus prose on the **stitching workflow** and **print-to-cut at true
  scale** — folded from `SHORTCUTS.md` (which stays as the long-form reference).
- **Light/dark aware**: base styles + a `body.light` override block (panel, headings, key chips).
- `help` smoke feature (7 asserts: element exists, toolbar button, open/toggle/close, section count,
  topic coverage); full suite **222/222**.

---

## v0.6.2 — 2026-06-03

### Light mode
A full light theme alongside the existing dark one, toggleable and remembered.

- **Toggle**: a standalone **pill switch in the top-right of the menubar** (`#theme-toggle` →
  `.theme-switch`/`.theme-knob`), with a label beside it reading **"Dark Mode" / "Light Mode"** to
  match the current state (the knob slides right in light). `toggleTheme()` flips `S.light`, persists
  `localStorage['lpat-theme']` (`light`/`dark`), and calls `applyTheme()` (which also sets the label).
  `restoreTheme()` runs in init (before the first `renderContent`) so a saved light session paints
  light with no dark flash. Default is dark. Light is a **UI/localStorage preference — not part of
  the `.lpat` save format** (like `showRulers`/props width), so no save-version bump.
- **View menu realigned** while here: labels are left-aligned and each item's checkmark is
  right-aligned at the dropdown edge (chk span moved to the end of every item; `.m-act` now uses
  `margin-left:auto` on `.kb`/`.m-chk` instead of `justify-content:space-between`, and
  `.m-nest>.m-act` stretches so nested page/snap checkmarks reach the edge). Shortcuts stay
  right-aligned, just inside the checkmark column.
- **CSS**: an **additive `body.light { … }` override block** appended after the dark rules — the dark
  theme is byte-for-byte untouched (zero regression risk), and `body.light` selectors win on
  specificity. Covers menubar, toolbar, props panel, layers, status bar, Settings/Page modals, the
  welcome screen, and the confirm/alert dialog. Grid-pattern lines (`#pgm-p`/`#pgM-p`) are recoloured
  via CSS too (CSS beats the SVG presentation attribute).
- **JS-painted SVG** reads `S.light` at render time (CSS can't reach these inline-styled bits):
  grid-off background fill, rulers (strips/corner/ticks/labels) in `renderRulers`, the page-boundary
  rect + label, the drag **dim overlay** (`dimLabel`) and **pen-hint** text — each flips to a
  light-on-dark→dark-on-light halo+fill scheme.
- The **red accent** (`#c0392b`/`#e74c3c`) is deliberately shared by both themes. **Print is
  unchanged** — the `@media print` rules already force black/white and `!important` beats everything.
- **Two version identities** (shown bottom-right on the welcome screen): `APP_VERSION` (the dev /
  working number, `v0.6.2`, bumped by hand) and `BUILD_TAG` (the packaged-build name = two random
  words + `-V<n>`, e.g. `copper-marten-V2`, `n` = build count). The build ledger lives in
  **`desktop/build-info.json`** (`buildCount`/`buildTag`/`history`); each `/build` increments the
  count, mints two fresh random words, updates `BUILD_TAG` in `index.html`, then compiles.
  `renderHomeVersion()` stamps both into `#home-version`. **Desktop version synced 0.4.6 → 0.6.2**
  (`Cargo.toml` + `tauri.conf.json`), so the installer/exe now reads the real app version.
- Smoke: no new asserts (UI/visual only); full suite **215/215**.

---

## v0.6.1 — 2026-06-03

### In-app themed dialogs + welcome-screen polish
Follow-ups so the app no longer leans on the browser's own popups, and the launch flow never blocks.

- **In-app confirm/alert** (`#confirm-bg`, `confirmModal(msg,opts)→Promise<bool>`, `alertModal`) framed
  in a **french-stitch border** (shared `frenchBorder` helper, also used by the welcome screen). The
  dialog owns the keyboard while open (Enter=OK, Esc/backdrop=cancel). Replaced every native call:
  New-file discard, the pen "discard in-progress path?" (deferred — `setTool` re-runs once confirmed),
  and the three file-error `alert()`s. `newFile()` is now async and returns whether it proceeded.
- **No launch prompt for auto-save recovery.** The old blocking `confirm()` on load is gone; instead
  the snapshot is captured at init (`readAutoSaveInfo`→`S._launchRecovery`) and offered as a **Restore
  card** above Recent files on the welcome screen (`recoverAutoSave`). So the app opens straight to a
  usable screen. `doAutoSave` pauses while Home is open so the recoverable snapshot isn't overwritten.
- **Home is a toolbar button now** (`#tb-home`, top of the toolbar above the tools) instead of being
  buried in the File menu (entry removed). The global keydown ignores canvas shortcuts while Home or a
  dialog is open.
- No save-format change. `home` smoke grew to 19 asserts (dialog open/close/labels/border, recovery
  card + apply, toolbar button); full **215/215**.

---

## v0.6.0 — 2026-06-03

### Home / welcome screen
A launch overlay so opening the app (especially the packaged build) starts somewhere friendly.

- **`#home` overlay** — "Welcome to Leather Pattern Designer", a **New File** and an **Open File**
  button (each calls the exact menu-bar action: `homeNew()`→`newFile()`, `homeOpen()`→`triggerLoad()`),
  and a **Recent files** list at the bottom. Shown on launch *unless* an autosave was recovered
  (`checkAutoSaveRecovery()` now returns a bool); also reachable via **File ▸ Welcome Screen**.
- **Recents** (`addRecent`/`getRecents`/`openRecent`) persist `FileSystemFileHandle`s in **IndexedDB**
  (`lpat-recents`), recorded on a successful Open or Save As, sorted newest-first (cap 8), shown with
  a relative timestamp (`relTime`). Clicking one re-verifies permission and reads the file straight
  back. Where the File System Access API is absent (today's WebView2/Tauri build), no handles can be
  stored so the list just stays empty and Open falls back to the normal picker/input — the screen
  itself still works. So this lands in the **HTML build now and benefits the desktop build for free**.
- **Decorative french-stitch border** (`renderHomeStitch`) — Vergez-Blanchard-style slits run along
  all four screen edges (screen-px), re-rendered on resize. Hidden in print.
- No save-format change (recents live in IndexedDB, not the `.lpat`). `home` smoke feature (11
  asserts; the homeNew test stubs `confirm()` — a blocking confirm during headless `--dump-dom` hangs
  the page). Full **207/207**.

---

## v0.5.2 — 2026-06-03

### 9-point text alignment (Figma 3×3 grid) — save format v12
Extends v0.5.1's horizontal align to full 2-axis box alignment, per user request.

- **`valign`** field (`top`/`middle`/`bottom`, default top). `renderText` now positions the wrapped
  line block vertically: `blockH = lines·lineH`, `blockTop` = `y+pad` (top) / centred (middle) /
  `y+h-pad-blockH` (bottom); baselines step from `blockTop+fontSize`. Horizontal `align` unchanged.
- **3×3 alignment grid** in the Text props group (`#pi-align-grid`) replacing the L/C/R row — 9
  cells, each a `valign×align` combo with mini "text-line" bars hugging the matching corner (Figma
  feel). `setTextAnchor(v,h)` sets both in one undo; `updatePropsPanel` lights the active cell.
- **Save bump v11 → v12**; `normText` backfills `valign`. `text` smoke +1 (25); full **196/196**.

---

## v0.5.1 — 2026-06-03

### Text alignment + fill toggle — save format v11
Two follow-ups to the text-box tool, both per user request:

- **Horizontal alignment** — new `align` field (`left`/`center`/`right`, default left). `renderText`
  maps it to the `<text>` `text-anchor` (`start`/`middle`/`end`) and the x reference inside the box
  (`x+pad` / `x+w/2` / `x+w-pad`). L/C/R toggle buttons in the Text props group; the in-place
  editor's `text-align` follows it too.
- **Fill toggle** — new `fill` field (bool, default true). Off → the glyphs render `fill="none"`
  with a `txt-hollow` class, so you get **outline-only/hollow text** (pair with Outline on). A new
  **Fill** checkbox sits above Outline. Print: filled text stays solid black; `.txt-hollow` prints
  as a black **outline** (`fill:none;stroke:#111`) so hollow text stays hollow on paper.
- **Save bump v10 → v11**; `normText` backfills `align`/`fill` on older text shapes. `text` smoke
  +6 asserts (24 total); full **195/195**.

---

## v0.5.0 — 2026-06-03

### Text-box tool (`T`) — save format v10
A new `type:'text'` shape: a wrap-bounded label box for putting text on the artboard.

- **Shape:** `{x,y,w,h, text, fontSize(mm), bold, italic, outline, outlineColor, outlineWidth, color}`.
  Geometry is the rect's box `{x,y,w,h}`, so a new `isTextLike(s)` (`= rect || text`) lets the box
  logic reuse the rect paths: `localAABB`, `nudgeShape`, `placeShape`, `shapeCenter`, `hitShape`,
  `getHandles` (8 resize handles), and the move/resize branches in `onMove`/`onDown`.
- **Font is in mm and fixed under resize** — dragging the box handles only changes `w/h` and
  re-wraps; the font size never scales (set it in the Properties panel). This was the core ask.
- **Horizontal auto-wrap** (`wrapTextLines`): greedy word-wrap to the box inner width at the box's
  weight, honouring explicit `\n` and blank lines; a single over-wide word is left to spill
  (vertical spill is allowed — not a dealbreaker, per the brief).
- **Render** (`renderText`): screen-only dashed frame (hidden in `@media print`) + left-aligned,
  top-anchored `<text>` lines (`txt-glyph`), `fill = color`, optional outline stroke behind the
  glyphs (`paint-order:stroke`), bold/italic. Prints solid black at true size.
- **Creation:** Text tool (toolbar `T` button + `T` key). Drag a box or click for a default
  60×20mm box; on create it drops to Select and opens an in-place `<textarea>` so you can type
  immediately. Double-click a text box re-opens the editor (Enter = newline, Ctrl/⌘+Enter or
  click-away commits with one undo, Esc reverts).
- **Props panel:** new Text group — content textarea (live render, one undo per edit session),
  font size (mm), **Bold**/*Italic* toggles, **Outline** on/off + width + colour swatches
  (`OUTLINE_COLORS` = black/white + palette), and text **Color** via the shared shape palette.
  Stitching/Corners/Convert are hidden for text; X/Y/W/H reuse the rect inputs.
- **Layers:** behaves like any shape (name from the first content line, colour swatch, reorder,
  select) but **no fill-opacity slider** (text has no fill region).
- **Save bump v9 → v10.** `applyLoadedData` runs every shape through `normText` so older files +
  partial text shapes backfill defaults. `text` smoke feature (18 asserts); full **189/189**.

---

## Tooling — 2026-06-03 — Double-click smoke-test launcher

No app/version change. Added `run-smoke.cmd` in the project root: a double-clickable
launcher so the smoke tests can be run self-serve (no terminal, no Claude). It prompts
for a tier (Q=quick default / F=full), calls `tests\run-smoke.ps1` with `-NoProfile
-ExecutionPolicy Bypass`, prints an ALL PASSED / FAILURES summary line, and `pause`s so
the window stays open. ASCII-only, `cd /d "%~dp0"` so it works regardless of where it's
launched from. Verified end-to-end (quick tier 13/13).

---

## Docs — 2026-06-03 — Doc reorg + stitch-edge-logic skill

No app/version change. Three things:
- **All reference docs moved into `MD files/`** for easier human browsing: `CONTEXT.md`,
  `DEVLOG.md` (this file), `SHORTCUTS.md`, plus the new skill. **`CLAUDE.md` stays at the
  repo root** (Claude Code auto-loads it). All cross-references updated (`CLAUDE.md`,
  `desktop/README.md`, the CONTEXT file map, and the version-bump-checklist memory).
- **Authored a reusable skill** documenting the saddle-stitch hole-generation algorithm —
  `MD files/SKILL.md` + `references/algorithm.md`: inset offset, EVEN distribution,
  geometric harsh-corner detection, miter + `2m` cap, per-edge runs, edge-tangent
  orientation, min-gap cull, and the `roundedRectPathPts` single-corner-anchor rule (the
  hard-won fixes from v0.3.x and v0.4.11). Knowledge/reference skill, no code change.
- **Triggering pass (lightweight):** refined the skill `description` against a 13-query
  should/shouldn't set — added an explicit "do NOT use for" clause (hand-sewing technique,
  CSS borders, flex/grid spacing, sheet-perforation grids) to curb over-trigger on those
  near-misses. (The automated `run_loop.py` optimizer is Unix-only — `select()` on pipes —
  and ×3×N Opus subprocess runs were too costly; did the analysis-based pass instead.)
- Not under `.claude/skills/`, so the skill won't auto-load until moved/packaged.
- **End-of-session sweep:** fixed a stale `CLAUDE.md` line that still described the save
  format as "version 7 / v1–v6 files" — actual is `version:9` (and CONTEXT/SHORTCUTS
  already say v9). Now reads "version 9 / v1–v8". Quick smoke 13/13.

---

## v0.4.11 — 2026-06-03

### Fix: stitch holes bunched at corners on mixed-radius rects
- **Repro:** rect tool → square → uncheck "Link all corners" → set one corner to e.g. 0.5. The
  stitch holes piled up 2–3 deep at the three *sharp* corners with crossed slit angles (the old
  corner-bunching issue, back again).
- **Cause:** any radius routes stitching to `stitchPath(roundedRectPathPts(...))`, and
  `roundedRectPathPts` always emitted **two points per corner**. A zero-radius corner put both
  points on the same vertex → **coincident anchors** → a zero-length segment that `samplePath`
  expands into ~40 identical samples → `stitchPath`'s corner detection / even-distribution
  degenerate (`atan2(0,0)`) → piled holes. Not from the recent pen/handle/Shift work — a latent
  mixed-radius bug, exposed by giving corners different values.
- **Fix (Option A):** `roundedRectPathPts` now emits a **single `corner:true` anchor for a sharp
  (r=0) corner** and two smooth arc anchors only for rounded corners (variable point count). That
  produces the clean mixed path `stitchPath` already handles — so a mixed-radius rect stitches like
  the rect tool. Also stops convert-to-path from baking duplicate anchors. Fully-rounded rects are
  unchanged (same 8 points, just rotated start index).
- New `stitch-radii` regression feature (6 asserts: no coincident anchors, no piled holes, 3 forced
  corner holes not doubled). Full suite **171/171**.

---

## v0.4.10 — 2026-06-03

Two separate Shift-snap changes (kept clean and independent):

### 1 · Shift angle-snaps a control handle
- Dragging a path control handle with **Shift** now snaps its **angle** to the nearest 45°
  around its anchor (keeping the handle's length) — the white-arrow companion to v0.4.9.
  Anchor (whole-point) drags snap to the **grid** under Shift. New `snapAngle()` helper.
- `dragPathHandle` now takes raw local coords + a `shift` flag and does its own snapping
  (was handed pre-grid-snapped coords).

### 2 · Pen Shift = snap to grid
- In the **pen tool**, holding **Shift** while placing points now snaps the anchor to the
  **grid** (it previously angle-snapped the segment to 0/45/90°). This makes Shift mean
  "grid-snap" consistently everywhere in the app. `penPoint` simplified to the grid path;
  the cursor tip + pen panel hint updated.
- Smoke: `pen-snap` feature renamed `pen-grid` (now asserts grid snapping); `path-handles`
  gains 2 asserts for the handle angle-snap. Full suite **165/165**.

_Note: this removes the pen's segment angle-snap. If you want a constrained straight/45° pen
line back, say so — it can live on a different modifier._

---

## v0.4.9 — 2026-06-03

### Direct handle editing — Illustrator white-arrow
- **Drag a path control handle to reshape just that side of the curve.** On a smooth point the
  opposite handle now rotates to stay collinear but **keeps its own length** (it used to be a
  full mirror — both sides resized together). So you can tweak one side's curvature without
  disturbing the other.
- **Alt-drag breaks the tangent** → a **cusp**: the dragged handle moves on its own and the
  anchor is marked independent so the break sticks. Exactly like Illustrator's white arrow.
- A cusp is stored as `corner:true` with extended handles; handle render + hit-testing now show
  a side whenever it's smooth **or** extended (`cpOff`), so broken handles stay visible/grabbable
  while a true collapsed corner still shows none. The **Smooth**/**Corner** buttons reset it.
- Undo/snapshot plumbing unchanged (handle drags already snapshot on grab). Panel hint + SHORTCUTS
  updated. New `path-handles` smoke feature (11 asserts). Full suite **163/163**.

---

## v0.4.8 — 2026-06-03

### Pen QOL: click = corner, click-drag = smooth (mode retired)
- **Anchor sharpness is now decided by the gesture, not a mode.** A plain **click** drops a
  **corner** anchor (collapsed handles); a **click-drag** drops a **smooth** anchor whose
  handles follow the drag (incoming reflected). Dragging back onto the anchor before release
  reverts it to a corner, live.
- **Retired the Smooth/Corner mode**: removed `S.penSmooth`, `togglePenSmooth()`, the **Tab**
  toggle, and the panel's Mode label + "Toggle Mode" button. Tab now only suppresses focus-jump
  while the pen is active.
- Net effect: the `corner` flag **always matches the geometry**, which is what the stitch
  harsh-corner detector wanted (it still detects geometrically as a backstop — see CONTEXT).
  The Pen panel already advertised "Click = corner / Click+Drag = smooth"; behaviour now matches.
- Cursor tooltip updated ("Click=corner  Drag=smooth"). New `pen-anchor` smoke feature
  (8 asserts, drives the real `penMouseDown/Move/Up`). Full suite **152/152**.

---

## v0.4.7 — 2026-06-02

### Duplicate shape (Ctrl+D)
- **`Ctrl+D` duplicates the current selection.** Each selected shape is deep-cloned
  (`JSON.parse(JSON.stringify)`), nudged **5 mm down-right** (`DUP_OFFSET` via
  `nudgeShape`, so rotated copies translate correctly), appended on top preserving the
  originals' relative z-order, and the **copies become the selection** — so a repeat
  Ctrl+D cascades and the new shapes are ready to drag.
- Works for **multi-select** (one copy per shape) and preserves all props (colour,
  rotation, stitch, label, radii, opacity) since the whole object is cloned.
- One undo entry; no-op on empty selection or mid-pen. `Ctrl+D`'s browser default
  (bookmark) is suppressed.
- New `duplicate` smoke feature (12 asserts). Full suite **144/144**.
- _Follow-up (backlog): Alt-drag to duplicate-and-move._

---

## Infra — 2026-06-02 — Desktop build scaffold (Tauri v2)

No app/version change (`index.html` untouched, still v0.4.6). Added a **fully isolated**
native-`.exe` wrapper under `desktop/`:
- `desktop/src-tauri/` — Tauri v2 project (Cargo.toml, build.rs, src/main.rs,
  tauri.conf.json, capabilities). No Node/JS bundler — the app is one static file.
- **Isolation by design**: `build.rs` *copies* the root `index.html` into
  `desktop/dist/` at build time (root file is read-only to the wrapper). A broken
  Tauri build can only cost the `.exe`; the browser app stays the fallback.
- Placeholder icon generated (`desktop/icon-source.png`); replace with a real logo.
- Setup + commands documented in `desktop/README.md`.
- **Toolchain installed + first build succeeded this session**: Rust 1.96.0 (MSVC),
  VC++ Build Tools (for `link.exe`), Tauri CLI 2.11.2. `cargo tauri build` produced
  `leather-pattern-designer.exe` (8.1 MB) + NSIS installer (1.8 MB) under
  `desktop/src-tauri/target/release/`. Verified the exe launches and the bundled
  frontend hashes equal the root `index.html`. WebView2 runtime already present.
- Backlog (CONTEXT.md): **multi-file tabs** added as a desktop-era milestone;
  **native save/load via Tauri dialog/fs plugins** flagged as the first desktop task
  (WebView2 may not expose `showSaveFilePicker`).

---

## v0.4.6 — 2026-06-02

### Rotate snap inverted
- Rotation is now **free by default**; **hold Shift to snap** to the rotate-snap increment (was the
  reverse). Matches the user's preferred muscle memory. One-line flip in the `onMove` rotate branch
  (`if(sk && step>0)`); Settings note + SHORTCUTS updated.

---

## v0.4.5 — 2026-06-02

### On-shape label halo + toolbar grouping
- **On-shape label outline is now a fixed screen-pixel halo** (`vector-effect="non-scaling-stroke"`,
  0.7px name / 0.55px dims) instead of a zoom-scaling mm width. It stays as fine as the shape
  outline (0.7px) at any zoom — previously the mm-based stroke fattened as you zoomed in.
- **Toolbar regrouped by purpose**: interaction tools (Select · Rotate) together, then a divider,
  then shape tools (Rectangle · Pen) — Rotate moved up out of the shape-tool group.

---

## v0.4.4 — 2026-06-02

### Print-accurate French slit size
- French stitch holes now render at a **Vergez Blanchard-referenced size: 1.2 mm long × 0.35 mm
  wide, ~30° slant** (was 1.4 × 0.44 mm at 35°). Since the app prints/exports at true 1:1 mm, the
  marks now match the physical iron. (`stitchHole`: `L=0.6, W=0.175, rotate(deg-30)`.)

---

## v0.4.3 — 2026-06-02

### Stitch hole defaults
- **Default hole style is now French** (`S.stitchStyle:'round'→'french'`) — matches the user's
  pricking irons. Existing files keep their saved style (load falls back to the saved value).
- **French slit mirrored** to a "droite"/straight slant (`rotate(deg-35)` was `deg+35`); it was
  rendering reversed relative to the irons in hand.

---

## v0.4.2 — 2026-06-02

### Rotation polish
- **Resize cursors now follow rotation.** `getCursorForHandle` / `edgeCursor` rotate the handle's
  outward axis by the shape's `rot` and map it to the matching bidirectional cursor
  (`dirCursor`/`rotDirCursor`) — so a 90°-rotated rect's left/right edges show ↕ and its top/bottom
  show ↔, instead of the old fixed-by-handle-id cursors. (5 asserts.)
- **Shape Properties spacing**: more breathing room between subcategories, each group heading now
  has a thin divider rule under it (`.p-grp` margin + `border-bottom`).
- **On-shape label outline halved** (`fs*0.06 → fs*0.03`) — the stroke was too heavy and muddied
  the text; now it's a thin legibility halo.
- Smoke 132/132.

---

## v0.4.1 — 2026-06-02

### Rotation pivot fix + Shape Properties reorg
- **Fixed pivot drift when resizing/editing a rotated shape.** Previously the rotation pivot was
  the *live* shape centre, so resizing (or a numeric W/H edit) moved the centre → the whole shape
  slid. Now any geometry edit **freezes the pivot** at the centre captured at drag-start
  (`beginEditPivot`), so the opposite corner/edge stays put — standard editor behaviour. On
  release the frozen-pivot offset is folded back into the geometry (`rebakeEditPivot`, translate by
  `(Rot−I)(C−P)`) so the stored centre is true again and there's no jump. Applies to handle resize,
  edge/segment drag, path anchor/cp drag, and the numeric Position/Size fields. (3 new asserts.)
- **Shape Properties panel reorganised into subcategories** (Figma/Illustrator-style): **Name** at
  the top, then **Position** (X | Y on one row), **Size** (W | H), **Rotation**, **Corners**, and
  **Appearance** (colour + type). X/Y and W/H are now paired two-column rows (`.p-grp` headings,
  `.p-pair`/`.p-field` layout). Per-type rows toggle inside shared groups; paths show read-only
  size + point editing, circles show radius.
- Smoke 127/127.

---

## v0.4.0 — 2026-06-02

### Rotate shapes 🎉 (save format v9)
- **Any shape can be rotated.** New `rot` field (degrees, clockwise, absent = 0) applied as a
  pure SVG `rotate(deg cx cy)` transform about the shape's centre. Geometry stays stored
  **unrotated/axis-aligned** — hit-testing & dragging convert the pointer into the shape's local
  frame via `toLocal`, so all the existing axis-aligned math is reused untouched.
- **Rotate tool** (toolbar, bound to **R**). The Rectangle tool moved to **B** (R was free-est for
  the headline new feature). Click a shape to grab + spin it about its centre.
- **Corner-rotate in the Select tool**: hovering the ring just *outside* a selected shape's
  bounding-box corner shows a rotate cursor (custom circular-arrow `ROTATE_CURSOR`); drag to
  rotate. Works for paths too (no corner handles needed) — the ring is the local AABB corners
  rotated into world space (`hitRotateZone` / `shapeCornersWorld`). Priority: resize handle →
  rotate ring → edge → body.
- **Snap**: rotation snaps to **15°** by default; the increment is a new **Settings → Rotate snap (°)**
  field (`S.rotStep`, 0 = free). Hold **Shift** while rotating to bypass the snap entirely —
  same muscle memory as the grid-snap bypass.
- **Properties panel**: a **Rotation°** field (all shape types) reads/writes the angle directly.
- Rotation-aware bounds: `worldAABB` rotates the local AABB corners; `getBBox`, shape-to-shape
  snapping (`shapeSnapBox`), and the marquee now track the rotated extent, so **fit/print capture
  the whole rotated piece**. `convertToPath` carries `rot` (and `opacity`) through the bake.
- Smoke: new `rotate` feature (17 asserts — `worldAABB`/`toLocal` round-trips, de-rotated hit
  test, render transform, save round-trip, drag-snap math, rotate-ring). Save round-trip bumped
  to v9. **124/124 full.**

---

## v0.3.32 — 2026-06-02

### Resizable right panel
- Added a thin drag handle between the canvas and the Properties/Layers panel. Drag it left
  to widen the panel (helps read long layer names), right to narrow it. Width is clamped
  180–520 px and persisted to `localStorage['lpat-props-w']`, restored on load
  (`startPropsResize` / `restorePropsWidth`). UI-only — no smoke coverage (no real layout in
  the headless harness).

---

## v0.3.31 — 2026-06-02

### Internal cleanup — no behaviour change

Trimmed duplication that had built up; smoke still **107/107**, no save-format change.

- **Shape render loop de-duplicated.** The four shape branches (rounded rect, plain rect,
  circle, path) were near-identical four-line blocks — fill + selection halo + outline stroke
  + hover outline, differing only by SVG tag and geometry attributes. Extracted
  `shapeGeo(s)` (→ `{tag, geo}`), `shapeBody(s,sel,hov)` (emits all four render layers), and
  `stitchFor(s)` (stitch data or null, incl. the rounded-rect synthetic-path case). The loop
  body is now ~7 lines instead of ~46. Also added `rectRounded(s)` for the
  `radii && radii.some(r>0)` test that was repeated in the loop and in `convertToPath`.
  Verified the rendered DOM is unchanged (rounded rect → `<path>`, circle → `<circle>`,
  selection halo present, group count correct).
- **`convertToPath`** now reuses `rectRounded` and the existing `makePt` instead of a local
  corner-point literal.
- **Smoke harness** point-makers consolidated: `stitch-convert` / `stitch-acute` each
  re-declared an identical `mk`/`mkS` corner-point literal. Replaced with two shared
  `corner(x,y)`/`smooth(x,y)` wrappers over the app's own `makePt`, matching how the other
  features already build points. (The local `smooth` scene var was renamed `smoothSq` to free
  the helper name.)

---

## v0.3.30 — 2026-06-02

### Layers panel — drag-reorder + per-shape fill opacity

Each shape is now a layer in a new **Layers** panel (top of the side panel). The
`S.shapes` array order already *was* the stacking order (later in the array renders on
top); the panel just exposes it. The list shows the **top-most layer first**.

- **Reorder** — two ways: **drag the ⠿ grip** of a row onto another (a cyan line shows the
  drop position, above/below the target's midpoint), or the per-row **▲/▼ buttons**. Both
  go through `reorderLayerTo`/`reorderLayer` (work in visual top-first order, reverse back
  to the array). One undoable step; a no-move drop / boundary button is a no-op. Only the
  grip is `draggable`, so dragging never fights the row's opacity slider.
- **Fill opacity** — a per-row slider (0–100%) writes `sh.opacity` (0–1, **absent = 0**) and
  drives the shape's **fill solidity**, not a group alpha: `fillOpacityOf` maps it linearly
  onto fill-opacity `FILL_MIN(0.05) … 1`. So **0% = today's outline-only look**, **100% = a
  fully opaque filled shape** — which is what makes overlapping pieces (e.g. lining under top
  leather) read properly. The outline stroke stays full, and stitch holes + the label render
  *after* the shape group, so they always sit on top of the fill. While dragging,
  `setLayerOpacity` updates **only that shape's `.sh-fill` element via direct DOM** (no full
  re-render), so the live slider is never rebuilt out from under the pointer — there is no
  render-gate flag to get stuck. A pre-edit snapshot (captured per press) commits one history
  entry on release if the value changed.
- **Click a row** to select that shape (clears edge/anchor sub-selection). Selected layer
  is highlighted; a small swatch shows the shape's colour. Rows fall back to the type name
  (Rectangle/Circle/Path) when a shape has no label.

`opacity` is an additive optional shape field — older files load with it absent (treated as
0 = outline, matching how they already looked). **Save format bumped to v8** (round-trip
assert added). New `layers` smoke feature: reorder = array order (▲/▼ + drag), boundary /
self-drop no-op, undoable, fill-opacity mapping (0 → FILL_MIN, 1 → opaque), live fill-opacity
update, history commit, and a "panel not frozen after an opacity edit" regression guard.
Smoke: **107/107**.

_Two corrections made within this same session (feature unreleased):_
1. **Opacity semantics** — the first cut applied `sh.opacity` as a group alpha, which just
   faded the already-near-invisible outline (and vanished at 0). Reworked to drive fill
   solidity as above.
2. **Frozen panel** — the first cut gated `renderLayers()` behind an `S._opDrag` flag set on
   `pointerdown`, cleared on the slider's `change`. `change` never fires on a
   press-without-move, so one stray slider click stuck the flag `true`, froze the list, and
   made swatches "stay blue no matter what colour you set" **and** made ▲/▼ appear to do
   nothing. Removed the flag entirely (direct-DOM live update can't stick).

---

## v0.3.29 — 2026-06-01

### Save vs Save As — remembers the file, re-writes silently

Every save used to re-prompt for a location. Now the app keeps the open file's handle
(`S.fileHandle`):
- **Save** (Ctrl+S) writes straight back to the current file with no dialog (and a brief
  "Saved ✓" in the status bar). If there's no file yet, it falls back to Save As.
- **Save As…** (Ctrl+Shift+S, + File menu) always prompts and then remembers the new file.
- **Open** now uses `showOpenFilePicker` so the opened file becomes the Save target — open →
  edit → Ctrl+S writes back to the same file. (Falls back to the hidden `<input>` where the API
  is unavailable; that path leaves no handle, so Save prompts.)
- **New** clears the handle.

Permission is re-confirmed on the stored handle before writing (`ensureRW`); cancelling any
dialog is ignored. Browsers without the File System Access API keep the old download behaviour.
SVG export is unchanged (still prompts each time — it's an export, not the document). No
save-format change. Smoke: **92/92** (File System Access API isn't headless-testable; load +
round-trip still covered).

---

## v0.3.28 — 2026-06-01

### Print follows the artboard at true scale

Print preview was capturing the current screen view (with its pan/zoom), so shapes were offset
and spilled off the sheet. `printPattern` now prints the **artboard**: it resets pan to (0,0) and
zoom to 1 (so the `#vp` group maps world-mm → mm via `scale(PX)`), then sets a temporary
`viewBox="0 0 w·PX h·PX"` + `preserveAspectRatio` on `#cvs`. The `@page` size already matches the
artboard (`updatePrintPageSize`), so the artboard fills the sheet 1:1 — A4 prints A4, A3 prints
A3 — and anything outside the artboard is clipped by the SVG viewport. Live pan/zoom/selection and
the `#cvs` attributes are restored after the dialog closes. (Browser print path; not
headless-testable.) Smoke: **92/92**.

---

## v0.3.27 — 2026-06-01

### Stitching panel: swapped Margin / Spacing input types

The two fields now match how they're actually chosen:
- **Margin** (edge → stitch line) is a **free numeric** input (mm) — it was a 3 / 3.38 / custom
  preset dropdown.
- **Spacing** (hole interval) is a **dropdown of standard stitching-iron sizes** — 2.7, 3.0,
  3.38, 3.85 mm — plus a **Custom…** option (which reveals a numeric field, and is what a loaded
  non-preset value shows as). It was a free numeric input.

`applyMarginPreset` → `applySpacingPreset`; `applyProps`/`updatePropsPanel` updated accordingly.
No data/save change (still per-shape `stitchMargin`/`stitchSpacing` numbers). New `stitch-inputs`
smoke feature exercises the panel I/O (numeric margin, preset + custom spacing, non-preset →
custom). Smoke: **92/92**.

---

## v0.3.26 — 2026-06-01

Three tweaks.

### 1. Gentler shape-snap, tied to the snap setting
Shape-to-shape alignment used a grabby fixed **7 px** catch radius. It's now
`clamp(snapMM·2.5, 3, 7)` px — much less harsh, and it follows the snap-grid setting (finer grid
→ tighter snap). Default `snapMM` 1 → a gentle 3 px.

### 2. Artboard name → document name
The Page / Artboard settings gained a **Name** field (`S.page.name`, default `Untitled`). The
artboard caption shows it (`Name · A4`), and **Save / Export use it as the default filename**
(`docName()` sanitises it for the filesystem). Additive save field — older files default to
`Untitled`.

### 3. Corner stitch angle follows an edge (not the bisector)
Reverted the v0.3.19 bisector orientation: corner (highlighted) holes again orient to an **edge**
tangent — outgoing edge at a run start, incoming at a run end — so the corner slit matches the run
of stitches it sits in instead of pointing diagonally. Now that the v0.3.21/22 spacing fixes
removed the bunching, edge-aligned corners read cleanly. (`stitchRect` + `stitchPath`; the unused
`bisect` helper was removed.)

Smoke updated (artboard name + doc-name round-trip; corner-angle assert flipped back to "all holes
edge-aligned"). **88/88**.

---

## v0.3.25 — 2026-06-01

### Save / Export now prompt for name + location

Saving used to silently download `pattern.lpat` to the Downloads folder. Both **Save (.lpat)**
and **Export SVG** now open a real **"Save As" dialog** via the File System Access API
(`showSaveFilePicker`) so you choose the filename and folder. New `saveBlob(blob, name, types)`
helper: uses the picker where available, silently ignores cancelling it, and falls back to the
old anchor-download on browsers that don't support it. Export builds the SVG and restores the
live view *before* prompting, so the picker keeps its user-gesture activation. No logic/test
change (browser API, not headless-testable). Smoke: **87/87**.

---

## v0.3.24 — 2026-06-01

Three QOL items (and groundwork for a future text tool).

### 1. Bigger edge hitbox
`hitEdge` tolerance 6 → **10 px**, so edges are much easier to grab.

### 2. On-shape labels render as outlines on screen
`.sh-label` / `.sh-label-dim` are now `fill:none` + a coloured stroke (hollow text), matching the
stitch-hole rings — a consistent vector/outline look (and sets up the planned text tool). Print
still maps labels to solid dark fill for legibility (`@media print`).

### 3. Multi-select
- `S.selIds` (array) is now the source of truth for selection; **`S.selId` is a derived getter** =
  the primary (last-added) selection, used by the props panel, resize handles, and edge/anchor
  editing. So every existing `S.selId = x` automatically means single-select, and only the
  multi-select paths touch `selIds`.
- **Shift-click** toggles a shape in/out of the selection. **Rubber-band** (drag on empty canvas)
  selects every shape whose bbox intersects the marquee; Shift keeps the existing selection as a
  base. **Drag any selected member** to move the whole group (`placeShape` translates each from a
  drag-start snapshot — one undo entry for the group). **Delete** removes all selected.
- All selected shapes get the selection highlight; resize/edit handles show only for a single
  selection. A plain click (no drag) on one member of a group collapses to just that shape.

New smoke features: `multiselect` (selId/selIds semantics, band hit, group delete, `placeShape`)
and `label-fit` from v0.3.23 carried forward. Smoke: **87/87**.

---

## v0.3.23 — 2026-06-01

### On-shape labels wrap + auto-shrink to fit the piece

Long piece names used to overrun the shape horizontally. Now `shapeLabel`:
- **Measures** text with a cached canvas 2D context (`measureTextW`) — accurate, and handles the
  `×` / `⌀` glyphs. font-size is passed as px; advances scale linearly so the width comes back in
  the same mm user-units the SVG text uses.
- **Word-wraps** the name (`wrapToWidth`) into multiple lines.
- **Shrinks to fit**: starting from the configured `labelMM`, it shrinks (and re-wraps) until the
  widest line and the total stacked height (name lines + dimensions) both fit ~**80%** of the
  shape — `s.w·0.8 × s.h·0.8` for rects/paths, a `1.4·r` inscribed square for circles — so the
  label never overruns the piece or collides with the stitching. It never grows past `labelMM`,
  so it stays at the chosen size whenever it already fits. The whole block is vertically centred.

New `label-fit` smoke feature (long name in a small box wraps to ≥2 lines and shrinks below
`labelMM`; short name in a big box stays one line at `labelMM`). Smoke: **82/82**.

---

## v0.3.22 — 2026-06-01

### The real corner-doubling cause: harsh corners detected geometrically now

The corner bunching *kept* happening because every prior fix only applied to anchors flagged
`corner:true` — and the shapes hitting the bug weren't flagged that way. A square drawn with the
**pen in smooth mode** (the default — click each corner without dragging) produces anchors that
are `corner:false` with **coincident handles**: geometrically a sharp 90° turn, but flagged
"smooth." So the miter, the backtrack trim, the forced corner hole, and the bisector orientation
all skipped them, and the raw averaged-normal offset bunched holes at every corner.

Confirmed by dumping a 30×30: `corner:true` square → minGap 3.43 (clean); identical square with
`corner:false` coincident-handle anchors → 39 holes, minGap 1.94 (bunched).

**Fix:** harsh-corner detection is now **geometric** — an anchor is a corner when the stitch
line's tangent turns more than `HARSH_ANGLE` (~34°) across it, regardless of the `corner` flag.
Used in both the miter pass and the run logic. A genuine smooth bezier anchor (continuous
tangent, e.g. a converted circle) stays smooth; a sharp turn gets the full corner treatment
however it was created. Fixes existing shapes too, not just newly-drawn ones.

New `stitch-convert` checks: a 50×50 square built from `corner:false` coincident-handle anchors
gets 4 forced corners and uniform gaps (no bunching). Smoke: **78/78**.

---

## v0.3.21 — 2026-06-01

### Fixed doubled/bunched stitch holes at corners (offset-path backtrack)

Every corner of a pen/converted shape showed a tight pair of holes (a hole ~2.46 mm from the
corner while the rest of the edge was ~4.15 mm — read as a double).

**Root cause:** the inward-offset stitch path *backtracked* at sharp corners. We inset the corner
to its **miter** vertex (e.g. `(3,3)`), but the per-sample perpendicular offsets of the points
right next to it sit *behind* that vertex (`(1,3)`, `(2,3)`…). So the polyline went corner →
backward → forward. The even-distribution walks that wiggle by arc length, which inflates the
length near corners and drops an extra hole one short gap in. The min-gap dedup didn't catch it
(2.46 > its sp/2 threshold). Two "unbreakable" rules — *force a hole on the corner* and *distribute
evenly along the offset path* — were fighting because the offset path itself was malformed.

**Fix (chosen with the user):** build the inset path **cleanly**. When even-distributing a run,
**trim the per-sample offset points that fall outside the mitered corner** (projected behind the
start corner / beyond the end corner along the edge tangent), so each edge's stitch line runs
straight from one corner to the next with no backtrack. Spacing is then uniform right into the
corner, the corner hole stays exactly on the corner, and the dashed guide path is rebuilt from
the cleaned polyline (so it no longer doubles back either). Both rules now hold without conflict.

New `stitch-convert` check: a 50×50 converted square has uniform gaps end-to-end incl. the wrap
(max−min < 0.1 mm). Smoke: **76/76**.

_Note:_ when an inset edge length is an exact half-multiple of the spacing (e.g. 40×40, inset 34,
34/4 = 8.5) `round()` can land either way per edge from float noise — purely cosmetic, edges still
look even; chose 50×50 for the test to avoid the boundary.

---

## v0.3.20 — 2026-06-01

### Artboard label legible

The page/artboard caption (`A4 (210×297mm)`) was drawn at `font-size: 3/(zoom·PX)` — a fixed
**3 screen px**, basically unreadable. Bumped to 12 px, nudged the baseline up so it clears the
page edge, and lightened the colour (`#3a3a6a → #6a6aa0`). No logic change.

---

## v0.3.19 — 2026-06-01

### Corner stitch holes orient to the bisector (fixes "weird" corners)

With french/diamond slits, every corner looked jarring: the corner hole was oriented to the
**outgoing edge**, which is perpendicular to the slits approaching along the **incoming** edge —
so each corner showed a slit crossed against the edge run (worst on pen/converted paths, where it
read as an "X").

**Fix:** a sharp-corner hole now orients to the **bisector** of its two edges — the diagonal a
stitch naturally takes turning the corner, giving the clean "picture-frame" look (all four corner
slits point toward the centre). Edge holes still follow the edge tangent. Applied to both
`stitchRect` and `stitchPath` via a shared `bisect()`; the path version's neighbour lookup wraps
at the closed-path seam and skips the coincident duplicate sample, so the start corner (anchor 0)
bisects against the closing edge instead of a degenerate zero vector.

This supersedes the v0.3.14 "corner holes orient to one edge (out/in)" decision, which was right
for round holes (orientation invisible) but wrong for directional slits. Round holes are
unaffected (orientation doesn't change a circle).

Updated the angle smoke check: edge holes orient to the edge (0/90° on an axis-aligned square),
corner (`hl`) holes to the 45° bisector. Smoke: **75/75**.

---

## v0.3.18 — 2026-06-01

Three small UX changes.

### 1. Diamond hole style removed
Dropped the **Diamond** option from both the Stitching panel and Settings hole-style pickers —
only **Round** and **French** remain. The diamond rendering branch in `stitchHole` is kept as a
fallback so any older `.lpat` saved with `stitchStyle:'diamond'` still draws (it just can't be
selected anymore).

### 2. Stitch holes drawn as outlines
`.st-dot` / `.st-dot-hl` are now `fill:none` + a thin stroke (0.13 / 0.17 mm) instead of solid
fill, so holes read as rings/outlines (clearer where the actual hole sits, and lighter on the
eye). Print CSS updated to match — outlines print as standard dark hairlines; the teal corner
highlight stays screen-only.

### 3. Pen tool: Shift snaps the segment to 0/45/90°
While drawing with the pen, holding **Shift** now constrains the segment from the previous anchor
to the nearest cardinal / 45° direction (keeping the cursor's distance), and the dashed preview
mirrors it so the click lands exactly where shown. New `penPoint(mm, shift)` helper; with no
previous anchor (or no Shift) it falls back to plain grid snap. Added a `Shift — snap to 0/45/90°`
line to the Pen Tool panel hints.

New `pen-snap` smoke feature (shallow angle → horizontal, distance preserved, ~45° → diagonal,
no-shift leaves the cursor free). Smoke: **74/74**.

---

## v0.3.17 — 2026-06-01

### Stitches now distribute evenly between corners (parallel edges line up)

On a tall thin rectangle the left and right stitch columns were vertically offset from each
other. Cause: the rect marches **clockwise**, so the right edge measured holes from the *top*
corner and the left edge from the *bottom* corner, and each dumped its leftover remainder at the
*far* corner (top for one, bottom for the other) — so the two columns ended up shifted by that
remainder. Same issue on every parallel pair, and on converted/pen paths.

**Fix — even distribution.** Each edge (and each path *run* between corners) is now divided into
`N = round(len / spacing)` **equal** steps, so holes land exactly on *both* endpoints and every
gap is identical (actual spacing = `len/N`, within a hair of the target). Because a full edge row
picks up its far corner from the perpendicular edge, each row/column becomes a uniform `N+1` grid
— and since parallel edges share a length, their grids are **identical → aligned**. The 2nd-last
→ last gap is now the same as every other gap.

This supersedes the v0.3.7 "true spacing, remainder at the far corner" behaviour (which the user
specifically asked to change). `stitchRect` and `stitchPath` use the same scheme, so a rect square
and a converted/pen square still stitch identically. Smooth-corner flow-through, the acute-corner
miter cap, and the min-gap dedup are all preserved — the path version even-distributes per *run*
(runs break at unstitched edges and harsh corners; smooth anchors flow through), so closed smooth
blobs now distribute perfectly around the loop with no seam gap.

Tests: rewrote the `stitch-rect` asserts (uniform spacing, both corners hit, spacing ≈ `len/N`)
and added **`rect parallel edges aligned (top x == bottom x)`**. Smoke: **70/70**.

---

## v0.3.16 — 2026-06-01

### Selected-edge highlight much more visible

The selected edge was a thin gold line (`#ffd23f`, 2.6px) that was hard to tell apart from
the cyan hover preview. It's now a **glowing magenta** highlight: a soft `rgba(255,45,214,0.32)`
halo (10px) under a bold `#ff2bd6` core (4.2px). Unmistakable against both the canvas and the
cyan hover.

### Circle tool removed (logic kept)

Per user request — one less tool to account for. **Only the create path is gone**: the toolbar
button and the `C` keyboard shortcut. Everything that handles circles — rendering, hit-testing,
move/snap, `stitchCircle`, the dimension label, and **"Convert to editable path"** (which keeps
the curve/bezier logic) — is untouched, so circles in **existing `.lpat` files still load,
display, stitch, and convert** exactly as before. Nothing was deleted from the data model; this
is a deliberate minimal change to revisit later.

No save-format change (still v7). Smoke: **68/68** (circle stitch still covered via `addShape`).

---

## v0.3.15 — 2026-06-01

### Convert a path point between corner and smooth

A pen point sometimes turned into a curve unintentionally (a tiny drag while placing it in
smooth mode flips it to a bezier anchor). There was no way to turn it back. Now:

- **Click a point** on a selected path to **select that anchor** (it highlights gold and
  stays highlighted). `S.selAnchor` tracks the index.
- The **Bezier Path** panel shows **Corner / Smooth** buttons for the selected point (the
  current type's button is disabled, so the active state is obvious), plus `#N — corner/smooth`.
- **Corner** (`setAnchorType(true)`) collapses both bezier handles onto the anchor → straight
  segments meet at a sharp point. **Smooth** (`setAnchorType(false)`) synthesises symmetric
  handles tangent to the line through the neighbouring anchors (Catmull-Rom style, handle
  length = ⅓ of the nearer neighbour distance, min 2 mm). Both are undoable.

Also fixed a long-standing papercut surfaced by this: clicking a handle **without moving it**
used to push a no-op history entry (`pushPreEditHist` fired unconditionally on resize mouseup).
It now only records history when the geometry actually changed — so selecting a point to
convert it doesn't bloat the undo stack.

New `anchor-type` smoke feature (corner→smooth clears the flag + makes real handles;
smooth→corner sets the flag + collapses handles onto the point). Smoke: **68/68**.

---

## v0.3.14 — 2026-06-01

### Stitch fix — converted/pen paths now miter their corners like the rect tool

A square drawn (or converted) as a path stitched its corners differently from the same
square made with the Square tool: the path's corner holes sat **too close to the actual
corner**.

**Root cause:** `stitchPath` offsets each sampled point inward by `m` perpendicular to the
local `prev→next` chord. At a sharp corner that chord is the *diagonal*, so the corner only
got inset by `m` along the bisector — distance `m` from the corner. `stitchRect` instead
insets each corner by `m` from *both* edges (distance `m·√2` along the diagonal). The two
disagreed at every harsh corner.

**Fix:** sharp-corner anchors (`corner:true`) now get a proper **miter offset**
`p + m·(n1+n2)/(1 + n1·n2)`, where `n1`/`n2` are the inward normals of the two adjacent
edges. For a 90° corner this resolves to inset `m` on each axis — exactly what `stitchRect`
does. Only harsh corners are mitered; smooth anchors (`corner:false`) keep the v0.3.13
flow-through behaviour untouched. The closing-seam duplicate sample is skipped when picking
the corner's neighbours, and near-180°/reflex vertices fall back to a single-edge offset to
avoid a miter blow-up.

**Follow-up — corner slit *angles*.** With the positions fixed, the french/diamond slits
near corners still looked crossed/jagged on paths. Two causes, both fixed:
- Hole orientation was read from the inward-offset array `off`, whose miter-displaced corner
  vertex skewed the tangent of the corner hole and its neighbours. Orientation now comes from
  the **original `samples`** (a straight edge keeps its exact edge tangent), and forced corner
  holes orient to a single edge — **outgoing** for a run start, **incoming** for a run end —
  mirroring how `stitchRect` orients its corner holes.
- The march ran `i <= i1` (to carry the last step's distance, v0.3.13) but would also *place* a
  regular hole exactly **at** the corner index when spacing landed there — duplicating the
  forced corner dot and carrying a diagonal, edge-straddling angle. At a hard boundary (harsh
  corner or run end) `i1` now only **accumulates** distance; the forced dot owns that spot.

**Follow-up 2 — acute corners (pile-ups + spikes).** On tight pen corners holes piled up
(3 holes on one point) and the offset guide spiked toward the centre. Two more fixes:
- **Miter cap.** The miter inset is `m/sin(θ/2)`, which blows up as a corner gets acute. The
  offset is now clamped to `2·m`, so a sharp corner bevels instead of spiking inward. (90°
  gives `1.41·m`, so right angles are untouched; only corners sharper than ~60° clamp.)
- **Minimum-gap pass.** After generating holes, any hole closer than `sp/2` to a kept
  neighbour is dropped; a forced corner hole wins over regular ones. Crucially the cull
  cascades **backwards** — when a corner hole removes one regular, it keeps popping earlier
  regulars still within range (an earlier removal can leave a two-slots-back hole newly
  adjacent, which a single forward scan misses — this was a real bug found via the harness).
  Closed paths also check the wrap (last vs first).

Very-sharp sliver corners (where the margin exceeds the local feature width, so the inward
offset crosses outside the shape) remain a known rough edge — the min-gap pass keeps them from
piling up, but the geometry there is inherently degenerate.

Regression checks: `stitch-convert` (corner positions within 0.3 mm + all angles edge-aligned)
and a new `stitch-acute` feature (thin sliver triangle: no two holes closer than `sp/2`, and
corner holes capped within `2·m` of their vertex). Smoke: **64/64** (was 58).

---

## v0.3.13 — 2026-06-01

### Stitch fix — smooth bezier corners no longer spike outside the curve

The `stitchPath` march was forcing a dot at **every** segment boundary (every anchor), regardless of whether it was a harsh corner or a smooth curve. For pen-drawn paths where a smooth anchor sits at the sharp "corner tip" with the bezier handles pulling the curve away from it, forcing a dot at that tip places it outside the visual rounded curve — producing the spiked/jagged corner appearance.

**Fix:** forced dots and spacing resets only happen at:
- Harsh corners (`corner:true` anchors) — unchanged behaviour
- The first segment of a stitch run (after an unstitched edge, or at the start of an open path)

Smooth anchors (`corner:false`) are now **flowed through**: `acc` carries forward, no forced dot is placed at the anchor tip, and the march continues from `i0+1` exactly as if the segment boundary weren't there. The march loop now goes up to `i<=i1` (previously `i<i1`) so the last step into the end anchor is accumulated and carries cleanly into the next segment.

End dots are placed only when a run terminates (next edge unstitched or path end). Harsh end-anchors no longer need a separate end dot — the next segment's forced start dot covers the same position without duplication.

All 58/58 smoke tests pass.

---

## v0.3.12 — 2026-06-01

### Convert basic shape to editable path

- "Convert to editable path" button in the Shape Properties panel for rectangles and circles.
- **Rect**: converts to a 4-anchor closed path (corner points, straight edges). If corner radii are set, the bezier handles bake the rounded corners in before converting.
- **Circle**: converts to a 4-anchor smooth bezier path using the standard k=0.5523 quarter-circle approximation (top/right/bottom/left anchors with symmetric handles).
- Conversion preserves stitch settings, colour, and label. `stitchEdges` is cleared (path edges differ from rect edge indices).
- Operation pushes undo history — "irreversible" from the UI, but Ctrl+Z recovers the original shape.

### Per-corner radius on rectangles

- Rectangles carry an optional `sh.radii = [tl, tr, br, bl]` field (absent = all zero = square corners).
- Shape Properties panel shows a 2×2 grid of corner radius inputs (TL/TR/BL/BR, mm) with a **Link all corners** checkbox that syncs all four on input.
- Rendering: when any radius > 0 the rect is drawn as an SVG path using arc commands (`A`) for exact curves; otherwise falls back to `<rect>` as before. Radii are capped at `min(w/2, h/2)` so corners never overlap.
- Stitching: rounded rects use `stitchPath` on a synthetic 8-point bezier path (`roundedRectPathPts`) so the stitch line correctly follows the curves at corners. Per-edge stitch is not available for rounded rects (stitch follows the whole perimeter).
- No save-format bump needed — `radii` is an additive optional field; older files load unchanged with square corners.

### Layers panel — TODO

See CONTEXT.md backlog entry. When you want to proceed, say so.

---

## v0.3.11 — 2026-06-01

Cleanup round + one new feature: feature-scoped tests, cache clearing, shape colours,
and Figma-style shape snapping.

### Per-feature smoke tests
- `smoke-harness.js` reorganised from two flat tiers into a **feature registry**
  (`FEATURES`): `core, history, saveload, page, color, snap, stitch-rect, peredge,
  stitch-circle, stitch-path, stitch-guard, bbox`. Each feature rebuilds its own scene,
  so any subset runs alone.
- `__SMOKE__(spec)` resolves a tier name (`quick` = core+history, `full` = all) **or** a
  comma/space-separated feature list. Unknown names fail with the available list.
- `run-smoke.ps1` gained `-Feature` (overrides `-Tier`); e.g.
  `run-smoke.ps1 -Feature "color,snap"`. Full is now **58/58**.

### Clear auto-save cache button
- Settings → Auto-Save → **"Clear auto-save cache"** (`clearAutoSaveCache()`) removes the
  `lpat-autosave` localStorage key with inline feedback — no digging through browser tools.

### Per-shape colour
- Shapes carry an optional `sh.color` (outline). New **Color** swatch row in Shape
  Properties (`SHAPE_COLORS` palette, `setShapeColor`, `shapeColor`). Fill/stroke are
  drawn with inline styles (`shFillStyle`/`shStrokeStyle`) so they beat the class rules.
- Selection no longer recolours to red — selected shapes keep their colour, gain a white
  halo + thicker stroke, and the handles stay the primary cue. **Print is still all-black**
  (the `@media print` `!important` rules override the inline colour), so patterns print clean.

### Shape-to-shape snapping (Figma-style)
- While moving a shape, its left/centre/right and top/centre/bottom snap to any other
  shape's edges and centres within ~7 screen px; **magenta guides** show the match.
  `shapeSnapBox`, `computeSnap`, `nudgeShape` are the new pieces; guides live in
  `S.snapGuides` and clear on mouse-up.
- Toggle in Settings → Snapping → **"Snap to other shapes"** (`S.snapShapes`, on by
  default). Hold **Shift** while dragging to bypass it for plain grid snap.

### Save format
- Bumped to **v7**: settings now include `snapShapes`; shapes may include `color`. Older
  files load unchanged (missing fields default — colour → default blue, snap → on).

---

## v0.3.10 — 2026-05-31

### Auto-save interval — default 5 min, stepped ladder
- Default changed from 30 s → **5 min** (`S.autoSaveInt` 300).
- Settings "Interval" is now a dropdown instead of a free seconds field. Growing
  ladder: **Off / 5 / 10 / 15 / 30 / 45 min / 1 / 2 / 3 / 4 / 5 / 6 h** (`AUTOSAVE_OPTS`).
- Loaded files snap their saved interval to the nearest ladder value (`nearestAutosave`,
  which keeps a positive value positive — an old 30 s setting becomes 5 min, not Off).
- Status display gained an "Xh ago" tier for the longer intervals.
- No save-format change (v6) — `autoSaveInt` already existed.

---

## v0.3.9 — 2026-05-31

Big one: stitching went from per-shape to **per-edge**, plus edge selection/dragging.

### Edge selection + drag
- With a shape selected, **clicking an edge selects it** (`S.selEdge = {id, edge}`,
  highlighted gold; hovering an edge previews it cyan with a resize/move cursor).
- **Dragging the selected edge repositions it**: a rect edge resizes that side
  (reuses the existing resize machinery via a mapped n/e/s/w handle); a path segment
  translates its two endpoint anchors (+ handles). History committed on release.
- Edges: rect = 4 sides, path = one per segment, circle = none. `hitEdge`,
  `edgePathD`, `edgeCursor`, `distToSeg`, `startEdgeDrag` are the new pieces.
- Esc steps out of an edge to the shape; clicking elsewhere / changing tool clears it.

### Per-edge stitching (the point of edge selection)
- Stitch generation rewritten to be **per edge**. `sh.hasStitch` stays the master
  gate; new `sh.stitchEdges` is an array of stitched edge indices, or **undefined =
  all edges** (so every pre-existing file keeps stitching the full perimeter).
- Corner rule: each shared corner hole is placed once (by the edge that starts there),
  so adjacent stitched edges don't double up; an isolated stitched edge places **both**
  its corner holes so it ends cleanly. True spacing is kept within each edge.
- Panel: master becomes **"Stitch all edges"**; when an edge is selected a **"Stitch
  edge N of M"** checkbox appears. `setEdgeStitch` normalises the set (all-on →
  undefined, none → `hasStitch=false`). `setShapeStitch` is the all/nothing master.
- Path stitch is now per-segment (marches + resets at each anchor). Note: smooth-anchor
  paths now get a hole at each anchor (previously one continuous resample) — acceptable
  and arguably better; corner highlighting unchanged.
- Circle is unchanged (no discrete edges → stitched whole when `hasStitch`).

### Compatibility / tests
- No save-format change (still v6): `stitchEdges` is a shape field, absent = all edges.
- Smoke: full **50/50** (added 6 per-edge asserts: default-all, partial holes land
  only on stitched edges, all-on compaction, all-off clears master). Verified rendered
  DOM: gold selected-edge + cyan hover highlights, edge panel row/label/checkbox, and
  partial-stitch holes confined to the chosen edges.

---

## v0.3.8 — 2026-05-31

Three QOL features.

### 1. Hole style in the Stitching panel
- The round/diamond/french chooser (previously Settings-only) now also lives in the
  Stitching side panel (`pi-stitchstyle` → `setStitchStyle`). It's the same global
  `S.stitchStyle`, so panel and Settings stay in sync.

### 2. Stitching panel only shows when a shape is selected
- The whole Stitching section (`#sec-stitch`) is hidden when nothing is selected,
  matching the Shape Properties behaviour. Toggled in `updatePropsPanel`.

### 3. On-shape piece labels (printable)
- Each shape can carry a **label** (piece name) + a **"Show name + size on shape"**
  toggle (`label`, `showLabel`). When on, the shape renders its name and live
  dimensions centred on it (`shapeLabel`), sized in **mm** (`S.labelMM`, default 5) so
  it prints at true size. Rect → `W × H`, circle → `⌀ d`, path → bbox `W × H`.
- **Double-click a shape** (select tool) to edit the label in place: a positioned
  HTML input opens at the shape centre (`openLabelEditor` via `mmToScreen`), Enter
  commits, Esc cancels. Also editable from the Label field in Shape Properties.
- User text is escaped (`escapeXML`) before going into the SVG. Labels print dark
  (screen shows light); the print CSS maps `.sh-label`/`.sh-label-dim` to black/grey.
- Label size added to Settings → Canvas Labels.

### Save format → v6
- Adds `settings.labelMM`; shape `label`/`showLabel` ride along in the shape objects.
  v1–v5 files still load.

### Tests
- Smoke: full **44/44** (added label round-trip). Spot-checked rendered DOM: one
  `sh-label` + one dimension line, `<A>` escaped to `&lt;A&gt;`, and `#sec-stitch`
  hidden with no selection / shown with one.

---

## v0.3.7 — 2026-05-31

### Stitch fix — rect runs now keep the true spacing
- v0.3.6 forced holes onto rect corners but divided each edge **evenly** (`len/n`),
  which quietly changed the gap between holes away from the configured spacing. Now
  each edge **marches at the exact spacing** from its corner; the leftover lands as one
  short gap at the far corner (filled by the next edge's corner hole). So the straight
  run between corners holds the true `sp`, and only the corner gap is the intended
  mismatch. A guard drops the last hole if it would fall within `sp/4` of the far
  corner, avoiding a near-duplicate on top of the corner hole.
- (Paths already marched at `sp` and reset at each corner, so they were unaffected.)
- Smoke: full **43/43** (added: run keeps true spacing, uniform mid-run, per-edge
  march count).

---

## v0.3.6 — 2026-05-31

Four quality-of-life features.

### 1. Shift = momentary grid-snap while dragging
- `snapV(v, force)` gained a `force` flag. `onMove` passes `e.shiftKey` so holding
  **Shift** snaps the dragged thing to the grid even when global snap is off — applies
  to moving/resizing shapes, dragging path anchors & bezier handles, drawing
  rect/circle, and placing pen points. Release Shift for freehand.

### 2. Smart stitch alignment to harsh corners
- Stitch holes are now **forced exactly onto sharp corners** (all 4 rect corners; any
  `corner:true` anchor on a path; open-path ends get a clean start/end hole). Spacing
  resets from each corner, so the run into the next corner can be a short remainder —
  this is intentional and mirrors hand-stitching. Smooth blobs with no harsh corners
  fall back to the old even resample.
- Forced corner holes render in a **contrasting teal** (`.st-dot-hl`) with a hover
  **tooltip** explaining why the local spacing is uneven.
- Stitch functions now return holes as `{x,y,forced,hl,a}` (`a` = stitch-line tangent).

### 3. Renamed shape-property position fields
- Rect: `X/Y (mm)` → **Position X/Y (mm)**. Circle: → **Center X/Y (mm)**.

### 4. Stitch hole style: round / diamond / french
- New global `S.stitchStyle` (Settings → Default Stitching → "Hole style"):
  **round** (circle, default), **diamond** (rotated square), **french** (slanted slit).
  Diamond/french orient to the per-hole stitch tangent. Print maps highlights back to
  the standard dark-red so the teal is screen-only.

### Save format → v5
- Adds `settings.stitchStyle`. v1–v4 files still load (default `round`).

### Tests
- Smoke: **quick 14/14, full 40/40** (was 36). New full-tier asserts: rect forces 4
  corner holes that sit exactly on the corners, per-edge dot-count, closed path
  highlights its 3 corners, and `stitchStyle` survives the save round-trip. Also
  spot-checked the rendered SVG via `--dump-dom`: 7 highlighted holes (4 rect + 3
  triangle), 7 tooltips, french slits oriented with `rotate(...)`, zero round dots.

---

## v0.3.5 — 2026-05-31

### Internal cleanup — no behaviour change (kept it snappy)
- **History snapshots dedup'd.** The snapshot+restore logic was copy-pasted in five
  places (`pushHist`, `undo`, `redo`, and two inline pushes in `onUp`) and each one
  did redundant work: a per-shape `{...s, points:...map}` spread *before*
  `JSON.stringify` (which already deep-clones) and another `.map` *after* `JSON.parse`
  (which already returns fresh objects) — i.e. cloning twice over on every mutation.
  Collapsed into `snapshot()` / `pushUndo()` / `pushPreEditHist()`. Less allocation
  churn per edit, one place to reason about history.
- **Cached the status-bar spans** in a `ST` object at init. They were being
  re-fetched with `document.getElementById` on *every* mousemove (`st-pos`) and every
  render (`st-tool/zoom/shapes/hist`). Now looked up once.
- No save-format change (still v4). Smoke: **quick 14/14, full 36/36** — unchanged.

---

## v0.3.4 — 2026-05-31

### Rulers (`Ctrl+R`)
- Top + left rulers in **screen-pixel space** (drawn in a new `<g id="rul">` that
  lives inside `#cvs` but OUTSIDE the scaled `#vp` group, so tick lengths and
  label fonts are real pixels regardless of zoom).
- mm→screen mapping via pan/zoom; "nice" major-tick step auto-chosen so labels
  land roughly every ≥55px (1/2/5/10/20/50/100/200/500/1000 mm ladder), with
  unlabeled minor ticks at major/5.
- Live **cursor-position marker** (red line) on both rulers, redrawn on mousemove.
- Toggle via `Ctrl+R` (browser reload intercepted) or View → Rulers.
- `renderRulers()` is called from `updateTransform()` (covers pan/zoom + every
  full render) and on window resize. Hidden in print and stripped from SVG export.

### Page / Artboard — selectable size (single page, multi-artboard deferred)
- Page boundary is now a configurable **artboard**: A4 / A3 / Letter / Tabloid /
  Custom, plus Portrait/Landscape. Replaces the fixed 210×297 A4 rectangle.
- View menu: "Page Size" submenu + "Landscape" toggle; "Custom…" opens Settings.
- Settings modal gained a **Page / Artboard** section (preset, orientation,
  custom W×H mm shown only for Custom).
- `S.page = {preset, orient, w, h}`; `applyPageDims()` derives w/h from preset +
  orientation (Custom keeps user dims). `getBBox`/`zoomFit` unaffected (the page
  is not a shape).
- **Print/PDF now matches the chosen paper**: `updatePrintPageSize()` keeps a live
  `@media print { @page { size: <w>mm <h>mm } }` rule in sync.
- Save format bumped to **v4** (adds `settings.page`). v1–v3 files load fine and
  default to A4 portrait.

### Forward plan (agreed with user, NOT built yet)
- Multiple artboards will live in a dedicated **Artboards tab** and be selectable
  ONLY via a new **Artboard tool** — so artboards can't be nudged by accident
  while editing shapes. Each artboard will print/export as its own page.

### Tests
- Smoke harness gained page round-trip + orientation-logic asserts; bumped the
  version assert to 4. **Full tier now 36/36, quick 14/14.** Visually verified
  rulers + A3-landscape page render via a headless screenshot.
- _Doc fix:_ `CONTEXT.md` still listed the full tier as 31 asserts in two places
  (a stale pre-v0.3.4 count); reconciled both to 36 after re-running both tiers
  (14/14, 36/36 confirmed). Quick count of 14 was already correct.

---

## v0.3.3 — 2026-05-31

### Smoke tests (both tiers) — `/smoketest-quick` + `/smoketest-full`
- Added a headless test harness that exercises the **real** app logic (no mocked
  copy). `tests/run-smoke.ps1` injects `tests/smoke-harness.js` into a copy of
  `index.html`, runs it in **headless Edge** (`--headless=new --dump-dom`), and
  reads JSON results back out of the DOM. No npm / node / install required.
- **Quick** (14 assertions, ~5s): place rect + circle + 3-point bezier, assert
  shape & history counts at each step, undo×3 → 0, redo×1 → 1.
- **Full** (31 assertions, ~15s): all of quick, plus save/load round-trip
  (geometry + nextId + settings survive serialize→parse), stitch dot-count
  sanity for rect/circle/path, oversized-margin guard returns null, and
  zoom-fit bounding-box correctness.
- Wrapped as project slash commands in `.claude/commands/` so they're callable
  as `/smoketest-quick` and `/smoketest-full`.
- **Result: 14/14 and 31/31 passing** — no regressions found in the current code.

### Gotchas hit while building the runner (documented for future tests)
- PowerShell 5.1 reads no-BOM UTF-8 as ANSI; a stray em-dash in a quoted string
  decoded into a Unicode smart-quote that PS treats as a string delimiter →
  parse error. Keep `.ps1` files ASCII-only; read source with `-Encoding UTF8`.
- Edge writes a benign stderr warning that trips `$ErrorActionPreference='Stop'`.
  Run Edge via `Start-Process` with redirected output files to isolate streams.
- `--dump-dom` includes `<script>` source text, so a result marker that appears
  literally in the harness source gets matched by the runner's regex. Assemble
  the markers from string fragments so they're only contiguous at runtime.

---

## v0.3.2 — 2026-05-31

### Selection by shape area (closed paths)
- Added `pointInClosedPath()` using ray-casting on the sampled bezier points.
- `hitPathShape` now hits on **stroke proximity OR inside the closed fill** — clicking anywhere inside a closed bezier path selects it, not just near its edge.

### Hover highlight + cursor feedback (Select tool, idle)
- Every mousemove checks handles first, then shapes, then empty.
- **Handles** → cursor switches to the appropriate resize/move/crosshair cursor per handle type; hovered handle turns gold and scales up 1.6×; a soft glow ring appears around anchor points.
- **Shapes (not yet selected)** → cursor becomes `pointer`; a cyan `rgba(77,210,255,0.55)` outline appears around the shape.
- **Empty space** → cursor resets to default.
- Re-render only fires when hover state actually changes (not on every pixel move).

### Hover state cleanup
- `onDown`, `setTool`, and `cancelPen` all clear `S.hoverHandle / S.hoverShape` and reset `wrap.style.cursor` so stale hover visuals never linger.

### Hit testing (circular, upgraded)
- `hitHandle` now uses `dx²+dy² ≤ tol²` (circular) instead of separate x/y checks.

---

## v0.3.1 — 2026-05-31

### Bug fixes
- **Path not selectable after drawing** — root cause: `finishPen()` set `S.selId` to the new shape, then called `cancelPen()` → `setTool('select')`, which unconditionally zeroed `S.selId`. Fix: `cancelPen()` now switches tool state directly (updating button, cursor class, status bar) without going through `setTool()`, so `S.selId` is preserved. Placed paths are immediately shown selected with edit handles.
- **Preview curve invisible against background** — root cause: `stroke-width="${0.4/(zoom*PX)}"` with `vector-effect="non-scaling-stroke"` collapsed the rendered stroke to ≈0.1 px (invisible). Fix: path strokes now use mm-based widths (no vector-effect) so they render at ≈1.7 px at zoom 1 and scale naturally as you zoom in.

### Visual improvements
- In-progress pen segments: bright cyan `#4dd2ff`, solid stroke
- Preview cursor segment: white `rgba(255,255,255,0.92)`, dashed, clearly distinct from both background and placed segments
- Bezier control handles: orange circles, orange dotted lines to anchor, no vector-effect confusion
- Anchor squares: white / green (first point), correct visual size at all zoom levels

### Hit testing
- `hitPathShape` tolerance increased from 4 px to 6 px circular (was rectangular), step halved to 0.02 — catches thin or tightly-curved paths reliably

---

## v0.3 — 2026-05-31

### Auto-Save
- Saves to `localStorage` on a configurable interval (default 30 s, 0 = off).
- On startup, if a recovery snapshot exists, asks whether to restore it.
- Status bar shows "Auto-saved ✓ / Xs ago / Xm ago" in green.
- Interval is set in Edit → Settings. Persists in `.lpat` save files (format v3).

### Pen / Bezier Tool  (`P` key, ✒ toolbar button)
- **Click** → place a corner anchor (straight line to next point).
- **Click + drag** → place a smooth bezier anchor; drag direction sets the outgoing handle; incoming handle is the mirror reflection, producing a natural S-curve.
- **Tab** → toggle Smooth / Corner mode on the fly. Mode shown in the cursor tooltip AND the "Pen Tool" side-panel section.
- **Preview line/curve** follows the cursor from the last anchor so you can see the next segment before committing.
- Cursor tooltip shows current mode (green = Smooth, orange = Corner) and contextual hints.
- **Enter or double-click** → finish as an open path and switch back to Select.
- **Click first anchor (≥2 pts placed)** → close and finish the path.
- **Escape / Del while drawing** → cancel and discard the in-progress path.

### Bezier Path Editing (Select tool on a placed path)
- Anchor points shown as white squares; bezier control handles as orange circles with dashed lines to their anchor.
- **Drag anchor** → moves the anchor and both of its handles together.
- **Drag a handle circle** → reshapes that bezier segment; the opposite handle reflects automatically (smooth point), keeping the curve continuous.
- "Closed path" checkbox in the Properties panel connects the last anchor back to the first.

### Stitch on Paths
- Stitch works on bezier paths too: samples the curve at ~0.5 mm intervals, computes the inward normal at each sample, offsets by the stitch margin, then places dots at the stitch spacing along that offset path.
- Winding direction (CW vs CCW) is auto-detected so the offset goes inward.

### Other
- Properties panel now shows a "Bezier Path" section with anchor count, bounding box W × H, and closed toggle.
- Path bounding box used for Fit All (`F`).
- Save format bumped to **v3** (adds `autoSaveInt`).

---

## v0.2.1 — 2026-05-31

### Changes
- **Fixed dimension overlay font size** — was computing to a constant ~3 px regardless of zoom (unreadable). Now derived from `S.dimFontSize` (screen px), defaulting to **13 px** to match the properties panel. The label stays the same visual size at any zoom level.
- **Added "Canvas Labels" section to Edit → Settings** — slider (8–48 px) to adjust the dimension overlay font size. Value persists in the `.lpat` save file.
- **Fixed outline stroke width** — was scaling with font size (got fat at large sizes). Now fixed at 1.8 px visual independent of both zoom and font size.

---

## v0.2 — 2026-05-31

### Changes
- **Collapsible side panel sections** — "Shape Properties" and "Stitching" each have a ▾/▸ toggle header. Sections animate open/closed.
- **View + History moved to top menu bar** — View menu now has grid toggle (G), A4 boundary toggle, snap toggle (Shift+S), and inline snap-size presets (0.5 / 1 / 2 / 5 / 10 mm) with checkmarks. History limit lives in Edit → Settings.
- **Settings modal expanded** — now contains: history undo limit, default stitch margin, default stitch spacing, snap grid size.
- **Dimension overlay while dragging** — when moving or resizing a shape, a live overlay label appears above it showing `W × H mm` (rect) or `r = X mm` (circle) plus X/Y position. Also shown during drawing preview.
- **Shape summary line** — top of Shape Properties panel shows bold dimension summary (e.g. `120.50 × 80.00 mm`) so you don't have to read individual fields.
- **Snap size presets in View menu** — click any preset to set snap grid; active size shows ✓. Snap indicator appears in status bar when active.
- **Save format bumped to version 2** — includes `snapMM` in settings block; v1 files still load fine.

---

## v0.1 — 2026-05-31

### Initial build
- **Tools:** Select (V), Rectangle (R), Circle (C)
- **Canvas:** Pan (Space+drag or middle-mouse), zoom (scroll wheel toward cursor)
- **Selection:** Click to select shape; 8 resize handles on rects, 1 on circles
- **Stitching:** Per-shape toggle; stitch outline (dashed) + dot markers at computed intervals; preset margins 3mm / 3.38mm + custom; spacing configurable
- **History:** Full JSON snapshots; undo (Ctrl+Z) / redo (Ctrl+Y); configurable limit 10–500 (default 100)
- **File I/O:** Save/Load `.lpat` (JSON), Export `.svg` (correct mm dimensions), Print/PDF via browser dialog
- **Drawing preview:** Live dimension label while drawing
- **Grid:** 1mm minor / 10mm major; dynamically scaled stroke width so lines stay crisp at any zoom
- **A4 boundary:** Dashed reference rectangle (210×297mm)
- **Status bar:** Tool, cursor position (mm), zoom %, shape count, history count

