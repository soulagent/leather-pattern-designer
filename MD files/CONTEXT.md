# Leather Pattern Designer — Session Context
_Last updated: 2026-06-07 · Current version: v0.7.24 · Save format v14 (.lpd)_

---

## What this is

A single-file HTML/CSS/JS CAD app for designing leather patterns.
No build step, no dependencies — open `index.html` in any modern browser.

The user makes leather goods and needed a tool to:
- Draw pattern pieces (rects, circles, freeform bezier shapes)
- Simulate stitching (dots along an inset offset line)
- Print or save as PDF / SVG at the correct physical mm scale

---

## File map

```
Leather Stuff/
  index.html       ← the entire app (HTML + CSS + JS, ~1580 lines)
  CLAUDE.md        ← project instructions (STAYS at root — Claude Code auto-loads it)
  MD files/        ← all human-reference docs live here (moved 2026-06-03 for easy browsing)
    CONTEXT.md       ← this file
    DEVLOG.md        ← versioned changelog, one entry per session
    SHORTCUTS.md     ← keyboard shortcut reference
    SKILL.md         ← "stitch-edge-logic" skill — saddle-stitch hole generation
    references/
      algorithm.md   ← detailed stage-by-stage stitch algorithm walkthrough
  .working-on.txt  ← NOT app code. One line of free text naming the editor/feature
                     currently in focus (e.g. "Pattern Designer"). Read by the Claude
                     Code status line (~/.claude/statusline.ps1) and shown on a second
                     "Working On:" row. The status line also appends the current dev
                     version, parsed live from index.html's `const APP_VERSION` — so the
                     row reads e.g. "Working On: Pattern Designer v0.6.2" and tracks the
                     version automatically on each bump (don't put the version in this file).
                     Per-project: each editor folder keeps its own.
                     Edit the line to change the note. Safe to delete (row just hides).
  desktop/         ← NOT app code. Tauri v2 wrapper that ships index.html as a native
                     .exe. Fully isolated: build.rs copies the ROOT index.html into
                     desktop/dist/ at build time (root file is read-only to it), so the
                     browser app stays the source of truth + fallback. See desktop/README.md.
  tests/
    run-smoke.ps1      ← headless-Edge smoke-test runner (-Tier quick|full)
    smoke-harness.js   ← injected test body; asserts against real app logic
  .claude/commands/
    smoketest-quick.md ← /smoketest-quick slash command
    smoketest-full.md  ← /smoketest-full slash command
```

Save format: `.lpd` ("Leather Pattern Document" — JSON, schema version 14; renamed from `.lpat` in
v0.7.9). Also exports `.svg`.

---

## Architecture

### Coordinate system
- All shape data stored in **mm**.
- SVG viewport group `<g id="vp">` has transform `translate(panX panY) scale(zoom * PX_PER_MM)`.
- `PX_PER_MM = 3.7795275591` (96 dpi).
- To get a fixed N-pixel visual size inside the viewport group: `N / (S.zoom * PX)` mm.
- To get a stroke that scales naturally with zoom (recommended for shape outlines): use mm directly, no `vector-effect`.
- `vector-effect="non-scaling-stroke"` is used sparingly for things that truly must stay pixel-exact (grid lines via `pgmP/pgMP` stroke-width, updated in `updateTransform()`).

### Rendering
- Entire viewport content is rebuilt via `vp.innerHTML = h` on each `renderContent()` call.
- `updateTransform()` only updates the `<g>` transform + grid stroke widths — used for smooth pan/zoom without a full rebuild.
- SVG defs (grid patterns) are static in the HTML; only `<g id="vp">` is dynamic.

### State object `S`
All mutable state lives in one plain object. Key fields:

```js
S = {
  shapes,       // [{id, type:'rect'|'circle'|'path', ...geometry, hasStitch, stitchMargin, stitchSpacing}]
  nextId,       // incrementing shape id counter
  selId,        // id of selected shape, or null
  tool,         // 'select' | 'rect' | 'pen' | 'text' | 'rotate'  (circle tool removed v0.3.16)
  pan, zoom,    // viewport state
  hist, future, histLimit,  // undo/redo stacks (JSON string snapshots)
  cursorMM,     // {x,y} cursor position in mm
  hoverHandle,  // handle id string being hovered, or null
  hoverShape,   // shape id being hovered (unselected), or null
  selEdge,      // {id, edge} of the selected edge, or null
  hoverEdge,    // edge index under the cursor on the selected shape, or -1
  movingEdge, edgeDrag,  // path-edge translate state
  penPts,       // [{x,y,cp1x,cp1y,cp2x,cp2y,corner}] in-progress pen path
  penDown, penDragging, penDownPt, penLastDown,  // pen drag state (click=corner, drag=smooth)
  autoSaveInt,  // seconds between localStorage autosaves (0 = off)
  autoSaveLast, _autoTimer, _autoTick,
  showGrid, showPage, snap, snapMM,
  showRulers,   // bool — top+left ruler overlay (Ctrl+R)
  snapShapes,   // bool — Figma-style snap-to-other-shapes while moving (default on)
  snapGuides,   // [{type:'v'|'h', pos}] alignment guide lines, drawn only while moving
  artboards,    // [{id,name,preset,orient,w,h,x,y}] — positioned page rects (v0.7)
  activeArtboard, nextArtboardId,  // active artboard id (Settings/menu/print target) + id counter
  selArtboard, movingArtboard,     // Artboard-tool selection / drag state
  get page(),   // GETTER → the active artboard, so all legacy `S.page.*` code edits it transparently
  defMargin, defSpacing,  // default stitch settings
  stitchStyle,  // 'round' | 'diamond' | 'french' — global hole render style
  dimFontSize,  // px, for the canvas dim overlay labels
  labelMM,      // mm, on-shape piece-label size
}
```

### Shape data formats

```js
// Rectangle
{ id, type:'rect', x, y, w, h, hasStitch, stitchMargin, stitchSpacing }

// Circle
{ id, type:'circle', cx, cy, r, hasStitch, stitchMargin, stitchSpacing }

// Bezier path
{ id, type:'path',
  points: [{ x, y, cp1x, cp1y, cp2x, cp2y, corner }],
  closed,           // bool — whether last point connects back to first
  hasStitch, stitchMargin, stitchSpacing }

// Text box (v0.5 / save v12) — a wrap-bounded label box
{ id, type:'text',
  x, y, w, h,       // bounding box in mm (top-left + size, like a rect)
  text,             // content string ('\n' breaks lines); wraps horizontally to the box width
  fontSize,         // mm — FIXED; resizing the box only changes w/h + re-wraps (never scales the font)
  align,            // 'left' | 'center' | 'right' (v0.5.1) — horizontal: text-anchor + x reference
  valign,           // 'top' | 'middle' | 'bottom' (v0.5.2) — vertical: positions the wrapped block in the box
  fill,             // bool (v0.5.1) — false = outline-only (hollow) text; default true
  bold, italic,     // bool → font-weight 700 / font-style italic
  outline,          // bool — draw a stroke behind the glyphs (paint-order:stroke)
  outlineColor,     // hex (OUTLINE_COLORS palette: black/white first)
  outlineWidth,     // mm
  color }           // text FILL hex (reuses SHAPE_COLORS; set via the shared Color palette)
```

Text boxes have **no stitching** (`shapeEdgeCount`=0) and **no fill-opacity** (no Layers slider).
They share the rect's box geometry, so most box logic treats them together via the
`isTextLike(s)` helper (`= rect || text`): `localAABB`, `nudgeShape`, `placeShape`, `shapeCenter`,
`hitShape`, `getHandles`, move/resize branches. Font size is mm so text prints true-to-scale; the
dashed bounding frame is screen-only (hidden in `@media print`).

All shape types may also carry `label` (string piece name) and `showLabel` (bool) — when set, `shapeLabel()` renders the name + live dimensions on the shape (printable). Both default to absent/falsy on older files. They may also carry `color` (outline hex from `SHAPE_COLORS`); absent → `DEFAULT_SHAPE_COLOR`. Colour is a screen-only aid — print is always black. They may carry `rot` (degrees clockwise, **absent = 0**, v0.4) — applied purely as an SVG `rotate(deg cx cy)` transform about the shape centre at render time; **geometry is always stored unrotated/axis-aligned** and the pointer is converted into the shape's local frame for hit-testing/dragging (`toLocal`). They may carry `opacity` (0–1, **absent = 0**, v0.3.30) — drives the shape's **fill solidity** via `fillOpacityOf` (maps onto fill-opacity `FILL_MIN(0.05) … 1`): 0 = outline-only (the look before v0.3.30), 1 = fully opaque. The outline stroke stays full and stitch holes + label render after the group, so they sit on top of the fill. **Stacking order = the `S.shapes` array order** (later in the array renders on top); the Layers panel exposes & reorders it (drag the grip or ▲/▼).

Stitching is **per edge**: `hasStitch` is the master gate and `stitchEdges` is an optional array of stitched edge indices — **absent = all edges** (so pre-v0.3.9 shapes stitch the whole perimeter). Edges are: rect = 4 sides (0=top,1=right,2=bottom,3=left, clockwise), path = one per segment, circle = none.

Path point anatomy:
- `x, y` — anchor position
- `cp1x/cp1y` — incoming bezier handle (affects curve FROM previous anchor TO this one)
- `cp2x/cp2y` — outgoing bezier handle (affects curve FROM this anchor TO next one)
- `corner: true` — no handles, straight line to next; `false` — smooth bezier

---

## Key functions to know

| Function | What it does |
|---|---|
| `renderContent()` | Full SVG rebuild. Call after any state change. |
| `updateTransform()` | Just moves the viewport group. Call during pan/zoom for 60fps. |
| `pushHist()` | Snapshot current state into the undo stack. Call BEFORE mutations. |
| `snapshot(shapes=S.shapes, artboards=S.artboards, active=S.activeArtboard)` | `JSON.stringify({shapes,artboards,active})` — the canonical undo snapshot (v0.7.3 added artboards). `restoreHist` parses it back and clamps `active`/`selArtboard`/`nextArtboardId`. The `shapes` arg lets callers snapshot a modified shape list while still capturing current artboards (used by `pushPreEditHist` + group-move). |
| `pushUndo(snap)` | Push a snapshot onto `hist`, trim to `histLimit`, clear `future`. |
| `pushPreEditHist(sn)` | Retroactively record a shape's pre-edit state on move/resize release (snapshot was captured at drag start in `resizeSnap`). |
| `addShape(sh)` | pushHist → assign id → push → select → render |
| `duplicateSelected()` | Ctrl+D: deep-clone each selected shape, `nudgeShape` by `DUP_OFFSET` (5mm), append on top (relative z-order kept), select the copies. One undo; no-op on empty selection / mid-pen. |
| `hitShape(mx,my)` | Returns shape id under mm coords, or null. Iterates reverse (top-most wins). |
| `hitPathShape(sh,mx,my)` | Stroke proximity (6px circular) + ray-cast fill for closed paths |
| `pointInClosedPath(sh,px,py)` | Ray-casting on sampled bezier for area-based selection |
| `hitHandle(mx,my)` | Returns handle id string for selected shape's handles, or null |
| `getCursorForHandle(hid)` | Maps handle id → CSS cursor string |
| `getHandles(sh)` | Returns `[{id,x,y}]` for all drag handles of a shape. Path anchors expose `a-i` + (per side) `cp1-i`/`cp2-i` when smooth **or** that handle is extended (`cpOff`) — so cusps stay grabbable. |
| `cpOff(pt,which)` | Is control handle `which` (1/2) extended off its anchor? Gates handle render/hit so a true collapsed corner shows none but a cusp shows its broken sides. |
| `dragPathHandle(hid,mx,my,alt,shift)` | Drag an anchor (`a-`, carries both handles, grid-snaps) or a control handle (`cp1-`/`cp2-`). Coords are **raw** local mm; snapping is internal. Smooth point: opposite handle rotates collinear but keeps its length. `alt` (or an existing cusp): independent — and `alt` sets `corner:true`. `shift`: control handle snaps its angle to 45° (`snapAngle`); anchor snaps to grid. |
| `snapAngle(ax,ay,x,y)` | Snap `(x,y)` so the vector from `(ax,ay)` lands on the nearest 45° increment, keeping its length. Used by Shift handle-drag. |
| `pathToD(pts,closed)` | Builds SVG path `d` attribute from point array |
| `samplePath(sh)` | Samples all bezier segments at 40pts each → flat `[{x,y}]` array |
| `stitchRect/Circle/Path(sh)` | Returns `{pts:[{x,y,forced,hl,a}], path}`. Forces a hole onto every harsh corner (`hl`=highlight it; `a`=stitch-line tangent for diamond/french orientation). |
| `stitchHole(p)` | Renders one hole per `S.stitchStyle` (round/diamond/french); `hl` holes get teal fill + a `<title>` tooltip. |
| `shapeEdgeCount(sh)` | Edge count: rect=4, path=segments (n or n-1), circle=0. |
| `edgeStitched(sh,e)` | Is edge `e` stitched? Gated by `hasStitch`; `stitchEdges` undefined = all. |
| `setEdgeStitch(sh,e,on)` / `setShapeStitch(sh,on)` | Toggle one edge (normalises the set) / master all-on-or-off. |
| `hitEdge(sh,mx,my)` | Edge index near the cursor, or -1. `edgePathD(sh,e)` builds its highlight path; `edgeCursor(sh,e)` the cursor. |
| `startEdgeDrag(sh,e,mm)` | Begin edge reposition: rect → resize that side; path → translate the segment's anchors. |
| `shapeColor(s)` | `s.color` or `DEFAULT_SHAPE_COLOR`. `shFillStyle/shStrokeStyle` build the inline fill/stroke styles (which beat the class rules); `setShapeColor(hex)` sets it from the palette. |
| `rectToD(sh)` | SVG path `d` string for a rounded rect using exact arc commands. Called when `sh.radii` has any non-zero value. Falls back to `<rect>` otherwise. |
| `roundedRectPathPts(sh)` | Closed bezier path approximating a rounded rect (k=0.5523 quarter-circle handles). Used by `stitchPath` + `convertToPath` when a rect has corner radii. **Variable point count**: each corner emits two smooth arc points if `r>0`, or a **single `corner:true` anchor if `r=0`** (never two coincident anchors — that caused the v0.4.11 stitch-bunching bug). |
| `convertToPath()` | Converts the selected rect (including any baked radii) or circle into a `type:'path'` shape in-place. Preserves stitch/colour/label. Pushes undo. |
| `syncCorners(el)` | `oninput` handler for corner radius inputs — when "Link all corners" is checked, mirrors the changed input's value to the other three. No state change. |
| `applyCornerRadii()` | Reads the four corner radius inputs and writes `sh.radii = [tl,tr,br,bl]` to the selected rect. Called `onchange`. |
| `shapeSnapBox(s)` | Axis-aligned `{x1,y1,x2,y2,cx,cy}` for snapping any shape (= `worldAABB`, rotation-aware). |
| `rotPt(x,y,cx,cy,deg)` | Rotate a point about a pivot. `toLocal(mx,my,s)` = world→shape-local (rotate by `-rot` about `rotPivot`) — the keystone that lets every axis-aligned hit/drag function ignore rotation. |
| `rotPivot(s)` | The pivot a shape rotates about: live `shapeCenter`, or the frozen `S.editPivot.P` mid-edit. |
| `beginEditPivot(s)` / `rebakeEditPivot()` | Freeze the rotation pivot at drag-start so a resize keeps the opposite corner fixed; on release fold `t=(Rot−I)(C−P)` back into the geometry so the stored centre is true and there's no jump. |
| `localAABB(s)` / `worldAABB(s)` | Unrotated bounds / rotation-aware world bounds (rotates the 4 local-AABB corners). `worldAABB` feeds `getBBox`, snapping, and the marquee. |
| `shapeCornersWorld(s)` | The 4 local-AABB corners rotated into world space — used by the rotate ring. |
| `hitRotateZone(mx,my)` | True when the pointer is in the ring just *outside* a corner of the single selected shape (7–20 px). Below resize handles, above edges/body. Circles skipped. |
| `beginRotate(s,mm)` | Arms a rotate-drag: stores pre-edit snapshot + grab angle + start `rot`. onMove computes a relative spin — free by default, **Shift snaps** to `S.rotStep`°; onUp commits one undo entry. |
| `wrapRot(s,inner)` | Wraps SVG markup in the shape's `rotate()` transform (or passes through when `rot`=0). Used for the shape group AND its edit overlay. |
| `computeSnap(box,thr)` | Nearest edge/centre alignment of `box` to other shapes within `thr` mm → `{dx,dy,guides}`. `nudgeShape(s,dx,dy)` applies the nudge. Used in the move branch of `onMove`; excludes `S.selId`. |
| `clearAutoSaveCache()` | Removes the `lpat-autosave` localStorage key (Settings button). |
| `finishPen(closed)` | Commits `S.penPts` to `S.shapes`, then calls `cancelPen()` |
| `cancelPen()` | Clears pen state and switches to Select WITHOUT calling `setTool()` (important — setTool zeros selId) |
| `dimLabel(lx,ly,l1,l2)` | Returns SVG text with outline effect for canvas overlays |
| `shapeLabel(s)` | On-shape printable label (name + live dimensions), centred, sized in mm (`S.labelMM`). Rendered when `s.showLabel`. |
| `shapeCenter(s)` | Centre point (mm) of any shape — used by labels + the in-place editor. |
| `mmToScreen(mx,my)` | mm → screen px (inverse of `screenToMM`); positions the floating label editor. |
| `openLabelEditor(s)` | Double-click (select tool) opens a floating HTML input over the shape to edit `s.label`; Enter commits, Esc cancels. |
| `escapeXML(s)` | Escapes user-entered text before inlining it into SVG markup. |
| `isTextLike(s)` | `s.type==='rect' \|\| s.type==='text'` — both carry box geometry `{x,y,w,h}`, so box hit/handle/move/resize logic treats them together. |
| `makeTextShape(x,y,w,h)` / `normText(s)` | Build a text shape with defaults / backfill any missing text fields (defensive on load + render; `TEXT_DEFAULT_FONT/W/H`). |
| `wrapTextLines(s)` | Greedy word-wrap of `s.text` to the box inner width at the box's weight; honours explicit `\n` (and blank lines). A single over-wide word is left to spill. |
| `renderText(s,sel,hov)` | Renders a text box: screen-only dashed frame + wrapped `<text>` lines (`txt-glyph`). `align` sets `text-anchor`+x; `valign` positions the wrapped block (`blockTop` = top/middle/bottom); `fill:false` → `fill="none"`+`txt-hollow` class (prints as a black outline); optional outline stroke (`paint-order:stroke`), bold/italic. Called from the render loop (instead of `shapeBody`) and rotation-wrapped by `wrapRot`. |
| `textPad(s)` | Inner inset (mm) used for wrapping + glyph offset. |
| `applyTextProps()` / `toggleTextStyle(which)` / `setTextAnchor(v,h)` / `setOutlineColor(hex)` | Font-size/fill/outline edits (onchange, one undo each) / Bold·Italic toggle / set vertical+horizontal alignment from the 3×3 grid / outline colour (also turns outline on). |
| `beginTextEdit()`/`liveTextInput()`/`endTextEdit()` | Props-panel content textarea: snapshot on focus → live render per keystroke (no history) → one undo entry on blur if changed. |
| `openTextEditor(s)` / `closeTextEditor()` | Double-click (or on-create) floating `<textarea>` over a text box, sized/styled to match on screen. Enter=newline; Ctrl/Cmd+Enter or blur commits (one undo); Esc reverts. |
| `renderLayers()` / `layerRowHTML(s,sel,top,bot,nested)` / `shapeArtboardId(s)` / `toggleLayerGroup(key)` | Rebuilds the Layers panel, **grouped by artboard** (v0.7.2): shapes nest under collapsible artboard headers; `shapeArtboardId` = top-most artboard containing the shape's centre (else null → "Not on an artboard"). One section (single artboard holding all) → flat list, no header. Collapse state in `S.layerCollapsed`. Called at the end of `renderContent`. |
| `selectLayer(id)` | Select a shape from the Layers panel (clears edge/anchor sub-selection). |
| `raiseLayer/lowerLayer(id)` → `reorderLayer(id,dir)` | **Group-aware** (v0.7.2): swap with the nearest **same-artboard** neighbour in the z-direction (skips shapes on other artboards). One undo entry; group-front/back = no-op. |
| `layDragStart/Over/Leave/Drop/End` + `reorderLayerTo(dragId,targetId,after)` | Drag-to-reorder. Only the row's ⠿ grip is `draggable`; rows are drop targets. **Cross-group drops are rejected** (`layDrop` checks `shapeArtboardId` match) — membership is positional, not stored. `reorderLayerTo` works in visual (top-first) order then reverses back to `S.shapes`; one undo entry; self/no-move drop = no-op. |
| `fillOpacityOf(s)` | Maps `s.opacity` (0–1, absent 0) → rendered fill-opacity `FILL_MIN(0.05) … 1`. Used by `shFillStyle(col,fo)` in `renderContent`. |
| `opDragStart/setLayerOpacity/opDragEnd` | Opacity-slider lifecycle: snapshot on press; `setLayerOpacity` writes `sh.opacity` + updates **only the dragged shape's `#shg-<id> .sh-fill` fill-opacity via direct DOM** (no re-render, so the live slider survives — no gate flag); `opDragEnd` commits one history entry if changed + a full `renderContent`. |
| `buildSaveData()` | Returns the full `.lpd` JSON object |
| `applyLoadedData(data)` | Applies a loaded/recovered data object to state |
| `showHome()` / `hideHome()` / `isHomeOpen()` | The welcome overlay (`#home`). Shown on launch (always — never blocks) + via the **toolbar Home button** (`#tb-home`). Buttons `homeNew()`/`homeOpen()` = the menu New/Open actions; load paths call `hideHome()` on success. `hideHome` clears the launch recovery offer. |
| `frenchBorder(w,h,opts)` / `renderHomeStitch()` | `frenchBorder` returns the SVG slit run around a w×h rect (shared); `renderHomeStitch` draws it full-screen behind the welcome card, re-rendered on resize. |
| `confirmModal(msg,opts)` / `alertModal(msg,title)` / `closeConfirm(r)` / `isConfirmOpen()` | In-app themed dialog (`#confirm-bg`) framed in french stitching — replaces native `confirm()`/`alert()`. `confirmModal` → `Promise<bool>` (opts: `ok`/`cancel`(null hides → alert)/`danger`/`title`); Enter=OK, Esc/backdrop=cancel; owns the keyboard while open. `sizeConfirmBorder` fits the slit border to the box. |
| `readAutoSaveInfo()` / `recoverAutoSave()` / `renderHomeRecovery()` | Recovery is offered as a **card on the welcome screen** (no launch prompt). `readAutoSaveInfo` captures the snapshot at init into `S._launchRecovery`; the card applies it via `recoverAutoSave`. `doAutoSave` skips while Home is open so the snapshot isn't clobbered. |
| `addRecent(h)` / `getRecents()` / `openRecent(it)` / `renderHomeRecents()` | Recent files = `FileSystemFileHandle`s persisted in IndexedDB (store `lpat-recents`). Recorded on successful Open / Save As; `openRecent` re-verifies permission then reads the file. Degrades to an empty list where the File System Access API is absent (e.g. today's WebView2 build). `relTime(ts)` formats the "Xm ago" stamp. |
| `openHelp()` / `closeHelp()` / `toggleHelp()` / `isHelpOpen()` | In-app Help & Keyboard Reference overlay (`#help-bg`), opened by the `?` key or the toolbar **?** button (`#tb-help`). Owns the keyboard while open (Esc/`?` close). Light/dark aware; print-hidden. |
| `getArtboard(id)` / `hitArtboard(mx,my)` / `selectArtboard(id)` / `addArtboard()` / `deleteArtboard(id)` / `renderArtboards()` | Multi-artboard helpers (v0.7). `hitArtboard` = top-most rect under a point; `selectArtboard` sets active+selected and refreshes menu/print; `addArtboard` clones the active page setup to the right; `deleteArtboard` keeps ≥1; `renderArtboards` rebuilds the Artboards panel list. Artboard tool branches live in `onDown`/`onMove`/`onUp` (drag = reposition; `S.movingArtboard`). `getFitBox()` = shapes+artboards bounds for Fit-All (`getBBox` stays shapes-only). |
| `artboardSVGClone(ab)` / `buildPrintPages()` | Print/export helpers (v0.7.1). `artboardSVGClone` clones `#cvs` framed to one artboard's region (viewBox + mm width/height) and strips screen aids (defs/grid/rulers/`.artboard-rect`/`.artboard-label`); used by `exportSVG` (active artboard) + `buildPrintPages`, which returns a detached `#print-root` (one `.print-page` per artboard) + named-`@page` CSS. `printPattern` appends it, injects a print stylesheet hiding the live UI, calls `window.print()`, then tears down. Caller renders at pan0/zoom1 first. `svgStringFor(ab)` / `buildSVGExports(all)` (v0.7.4) produce the export set `[{name,svg}]` (every artboard or just the active, de-duped filenames); `exportSVG` asks all-vs-active when >1 artboard and batch-downloads via `downloadBlob`. |

---

## Testing

Smoke tests run the **real** app logic headlessly — no mocked copy, no npm.

```powershell
tests\run-smoke.ps1 -Tier quick                # ~5s,  core+history (13 asserts)
tests\run-smoke.ps1 -Tier full                 # ~15s, every feature (390 asserts)
tests\run-smoke.ps1 -Feature stitch-rect       # just one feature
tests\run-smoke.ps1 -Feature "color,snap"      # a comma/space list
```

Or via slash commands: `/smoketest-quick`, `/smoketest-full`.

**Feature-scoped tests:** `smoke-harness.js` is organised as a `FEATURES` registry —
`core, history, saveload, page, color, snap, stitch-rect, peredge, stitch-circle,
stitch-path, …, stitch-radii, pen-grid, pen-anchor, path-handles, multiselect, duplicate, layers, text, home, rotate, stitch-guard, bbox`. Each feature rebuilds its own scene, so any subset
runs alone (handy when you only touched one area). `__SMOKE__(spec)` accepts a tier
name (`quick` = core+history, `full` = all) **or** a comma/space-separated feature
list; unknown names fail with the available list. `run-smoke.ps1 -Feature …` overrides
`-Tier`.

**How it works:** the runner reads `index.html`, injects `smoke-harness.js` plus
a `window.__SMOKE__('<spec>')` call just before `</body>`, writes a temp file, and
runs it in headless Edge with `--dump-dom`. The harness asserts against live `S`
state and the app's own functions (`addShape`, `undo`/`redo`, `buildSaveData`/
`applyLoadedData`, `stitch*`, `computeSnap`, `getBBox`, `zoomFit`), then writes a JSON
result into a `<pre>` that the runner greps out of the dumped DOM. Exit code 0 = all pass.

The harness drives logic directly (e.g. sets `S.penPts` then `finishPen()`) rather
than simulating mouse events, so tests are deterministic and don't depend on the
headless viewport size. To add a check, add an `assert(...)` line to the relevant
feature function in `smoke-harness.js` (or add a new feature + register it in `ORDER`).

---

## Known gotchas & decisions

### `cancelPen` must NOT call `setTool`
`setTool(t)` unconditionally sets `S.selId = null`. When `finishPen` creates a shape, it sets `S.selId` to the new id, then calls `cancelPen`. If cancelPen called `setTool`, it would immediately deselect. So `cancelPen` manually switches tool state (button active class, cursor class, status text) without going through `setTool`.

### Rotation: transform at render, de-rotate at input (v0.4)
Shapes store geometry **unrotated**; `rot` is applied only as an SVG `rotate(deg cx cy)` transform. The pivot comes from `rotPivot(s)`: normally the live `shapeCenter`, but **during a geometry edit it's frozen** at the centre captured at drag-start (`S.editPivot`, armed by `beginEditPivot`). The shape group **and** its edit overlay (handles/edges) are both wrapped via `wrapRot`, so handles land on the rotated shape with no per-point trig. For input, every hit/drag converts the pointer into the shape's local frame first (`toLocal` = rotate by `-rot` about `rotPivot`): `hitShape` (per shape in its loop), `hitHandle`, `hitEdge`, and the resize/edge drag branches in `onMove`. **Move/translate needs no conversion** (translating the stored geometry translates the rotated render identically).

**Pivot freeze + rebake (v0.4.1 — the fix for resize drift):** if the pivot were the *live* centre, resizing a rotated shape would slide it (the centre moves as geometry changes). So a geometry edit freezes the pivot at drag-start; the parts you're not dragging (opposite corner/edge) stay put because their local coords + the frozen pivot are both constant. On release, `rebakeEditPivot` translates the geometry by `t = (Rot−I)(C−P)` (C = true final centre, P = frozen pivot) — which is exactly the constant offset between rendering about P vs about C — so normal centre-pivot rendering reproduces the dragged result with no jump, and `shapeCenter` is the true centre again. Armed in `onDown` (handle resize), `startEdgeDrag`, and `applyProps` (numeric W/H/pos); rebaked in `onUp` and at the end of `applyProps`.

### `vector-effect` + stroke-width gotcha
With `vector-effect="non-scaling-stroke"`, stroke-width is in **screen pixels** (bypasses the viewport scale). Without it, stroke-width is in **mm** (scales naturally). Mixing them produces invisible strokes like `0.4/(zoom*PX)` px ≈ 0.1px. Rule: use mm widths for path/shape strokes (no vector-effect); use `N/(zoom*PX)` mm for fixed-visual-size geometry (anchors, handles, grid).

### History for path moves
Paths use delta-based movement (`S.moveOff = {x:mm.x, y:mm.y}` updated per frame). On `mouseup`, the pre-move state (stored in `S.resizeSnap`) is pushed to history retroactively. This matches the pattern used for rect/circle moves.

### Stitch on paths — winding direction
`stitchPath` computes signed area of sampled points to detect CW vs CCW winding, then chooses which side to offset to.

### Stitch corner forcing + even distribution (v0.3.6 → refined v0.3.7 → reworked v0.3.17)
Harsh corners get a guaranteed hole. As of **v0.3.17** the run between corners is **distributed evenly**, not marched at the raw `sp`: each edge/run is split into `N = round(len/sp)` equal steps, so holes land exactly on *both* endpoints and every gap is identical (`len/N`, ≈ `sp`). This superseded v0.3.7's "true `sp`, remainder dumped at the far corner", which left parallel edges offset (the right edge measured from the top corner, the left from the bottom). Even distribution makes each full row/column a uniform `N+1` grid; parallel edges share a length so their grids are **identical → aligned**.

- **Rect**: each stitched edge places `N` holes from its start corner at `len/N`; the far corner is the next edge's start hole (or placed here if that edge is unstitched).
- **Path**: each anchor `k` maps to offset-polyline index `k*SEG_STEPS` (`SEG_STEPS=40` — **must stay equal to `sampleSeg`'s default step count**). Segments are grouped into **runs** (broken by unstitched edges and harsh corners; smooth anchors flow through), then each run is even-distributed along its offset arc length. **Harsh corners are detected geometrically (v0.3.22)** — the stitch-line tangent turning > `HARSH_ANGLE` (~34°) across an anchor — *not* the `corner` flag, because the flag can still disagree with the geometry (a smooth anchor dragged into a sharp turn, or legacy paths). _(Historically the bigger culprit was the old smooth/corner pen **mode**, retired v0.4.8 — a click in smooth mode made a `corner:false` anchor with coincident handles that was geometrically sharp; now click = corner, drag = smooth, so the flag matches the gesture.)_ At each harsh corner the offset uses a miter (capped at 2·m for acute angles) and the per-sample offsets that fall *outside* the miter are trimmed (v0.3.21) so the inset edge doesn't backtrack and bunch holes.

**Orientation:** every hole follows an **edge tangent** — `angAt` mid-edge, `angOut` at a run-start corner, `angIn` at a run-end corner — so a corner slit matches the run of stitches it sits in. (v0.3.19 briefly used the corner bisector for a picture-frame look, but the user preferred edge-aligned; reverted in v0.3.26 once the v0.3.21/22 spacing fixes removed the corner bunching that made edge-aligned look crossed.) Round holes are orientation-invariant.

Corner holes are highlighted (`hl`) with a tooltip. `stitchRect` and `stitchPath` use the same scheme, so a rect square and a converted/pen square stitch identically.

### Per-edge stitching (v0.3.9)
Both `stitchRect` and `stitchPath` now generate holes **one stitched edge at a time** (see `edgeStitched`). The shared-corner rule: each edge places a hole at its **start** corner, and also at its **end** corner only when the next edge is *not* stitched. So a run of adjacent stitched edges places each shared corner once (no doubles), while an isolated stitched edge gets both of its corner holes. `path` in the returned `{pts,path}` is now one sub-path (`M…L…`) per stitched edge, so the dashed guide only shows on stitched sides. Path stitch marches per segment and resets spacing at every anchor (so smooth-anchor paths get a hole at each anchor — a deliberate change from the old single continuous resample).

### Stitch smooth-corner flow-through (v0.3.13)
`stitchPath` only forces a dot and resets `acc` at **harsh corners** (`corner:true`) or at the start of a stitch run. Smooth anchors (`corner:false`) are flowed through — the march loop runs `i0+1..i1` (inclusive) so the last step carries into the next segment. End dots are placed only when the run terminates. This prevents stitch dots from landing at the "corner tip" of smooth bezier curves, which is the anchor position but visually outside the rounded curve.

### Per-shape colour is screen-only (v0.3.11)
Shape fill/stroke are drawn with **inline `style=`** (so they override the `.sh-fill`/`.sh-stroke` class rules — attribute fill/stroke would lose to a CSS class). Selection no longer recolours to red: the selected shape keeps its colour and gains a white halo + thicker stroke, with handles as the primary cue. The `@media print` rules use `!important`, which beats inline styles, so colour never reaches print — patterns stay all-black by design.

### Shape-to-shape snapping (v0.3.11)
`computeSnap(box, thr)` snaps the moving shape's left/centre/right and top/centre/bottom to other shapes' edges/centres independently per axis, returning `{dx,dy,guides}`. It runs in the `S.moving` branch of `onMove` (excludes `S.selId`, threshold ~7 screen px), `nudgeShape` applies the offset, and `S.snapGuides` (magenta lines) render only while moving and clear on mouse-up. Holding **Shift** bypasses it (plain grid snap). Toggle: `S.snapShapes` (Settings → Snapping). For paths the snap offset is baked into the points and recomputed each frame, so it self-corrects without jitter.

### Hover re-render optimization
Hover detection runs on every `mousemove` when select tool is idle. `renderContent()` is only called when `hoverHandle` or `hoverShape` actually changes value (diff check before calling). This prevents per-pixel re-renders.

### `roundedRectPathPts` must collapse zero-radius corners (v0.4.11)
A rect with **any** corner radius routes stitching through `stitchPath(roundedRectPathPts(...))`.
The function emits a **variable** number of points: two smooth arc anchors for a rounded corner,
but a **single `corner:true` anchor for a sharp (r=0) corner**. Do **not** "simplify" it back to a
fixed 8 points (two per corner) — that puts two *coincident* anchors at every sharp corner, a
zero-length segment `samplePath` blows up into ~40 identical samples, and `stitchPath`'s
corner/harsh/even-distribution math degenerates (`atan2(0,0)`) and **piles holes at the corner**.
This is the regression that hit when one corner of a square was rounded and the rest left sharp.
Guarded by the `stitch-radii` smoke feature.

### Cusps reuse the `corner` flag (v0.4.9)
Direct handle editing (Illustrator white-arrow) needed a third anchor state: a **cusp** — a
point whose two control handles point independently (broken tangent). Rather than add a field,
a cusp is encoded as **`corner:true` with extended (non-collapsed) handles**. This works because
(a) `dragPathHandle`'s corner branch already moves a handle independently, and (b) handle
render/hit-testing was switched from "show if `!corner`" to "show if `!corner` **or** `cpOff`",
so a true (collapsed) corner shows no handles while a cusp shows its extended sides. The stitch
harsh-corner detector is geometric, so it treats a cusp as sharp automatically. `Alt`-drag sets
the flag; the **Smooth** button re-collinearises, the **Corner** button collapses to a true corner.

### Desktop build is isolated from the app (decision)
The Tauri wrapper lives entirely under `desktop/` and treats the root `index.html`
as **read-only**: `desktop/src-tauri/build.rs` copies it into `desktop/dist/` at
build time. This is deliberate — a broken Rust/Tauri change can only cost the `.exe`,
never the standalone HTML app, which remains the source of truth and the always-works
fallback (open it in a browser). Don't move app logic into the desktop layer; keep
`index.html` self-sufficient. Setup + commands: `desktop/README.md`.

### Auto-save uses `_autoTick` counter
`setupAutoSave()` sets a 1-second interval. Each tick increments `S._autoTick`. When it reaches `S.autoSaveInt`, `doAutoSave()` fires and resets the counter. This lets the status display update every second ("Xm ago") without a separate timer.

---

## What's been built (version history)

| Version | Key additions |
|---|---|
| v0.7.24 | **Accessibility: clickable `<div>`s → real controls.** Finishes the a11y pass started in v0.7.20. New `kbActivate(e)` helper (Enter/Space → `click()`, guarded by `e.target===e.currentTarget` so a container's handler never double-fires when a key bubbles up from an inner button/slider). Promoted to focusable, keyboard-activatable, screen-reader-announced `role="button"` controls: the property-panel **section headers** (`.p-hd` — set up in `initAccessibility`, `aria-expanded`/`aria-controls`, kept in sync by `toggleSection`), **tabs**, **artboard rows**, **shape + outline colour swatches**, **layer rows**, and **layer-group headers** (`aria-expanded`). Dynamic templates bake `role/tabindex/onkeydown` + `aria-label`; the existing global `:focus-visible` ring covers them all. `a11y` smoke feature (13 asserts); full **390/390**. _Remaining a11y carry-forward: `prefers-reduced-motion`._ |
| v0.7.23 | **Pen spline-closure + drag-on-resume; stitching QoL.** Closing a pen path now gives any **smooth** first/last anchor tangent-continuous handles (Catmull-Rom 1/6 from cyclic neighbours) so the loop joins without a kink — corners stay sharp (`applySmoothClosure`, called from `finishPen(true)`). **Resuming** an open path: a drag on the grabbed endpoint now sets *its* outgoing handle (cp2 only — additive, incoming curve untouched) so the continuation flows out smoothly (`S.penResumeAnchor`; armed in `penMouseDown`, applied in `penMouseMove`). QoL: the **Settings → Default spacing** control is now the same stitching-iron dropdown (presets + Custom) the per-shape Spacing uses (`SPACING_PRESETS` hoisted to a shared const; `onSettingsSpacingChange`); the properties panel shows a **multi-select summary** (count + per-type breakdown + combined bounds) when >1 shape is selected (`#multi-sel-msg`/`updateMultiSelSummary`). Smoke +18 across `pen-close`/`pen-resume`/`stitch-inputs`/`multiselect`; full **377/377** |
| v0.7.4 | **Export all artboards.** With >1 artboard, **Export SVG** asks (themed dialog) "All artboards / Active only". *All* writes one SVG file per artboard (each clipped + true scale) via direct download — `buildSVGExports(all)` returns `[{name,svg}]` with de-duped filenames (`Untitled`, `Untitled-2`, …); batch uses `downloadBlob` so N files don't each pop a save picker; a status flash confirms. *Active only* / single-artboard docs keep the picker path. Helpers `abFileStem`/`svgStringFor`/`buildSVGExports`/`downloadBlob`. `artboards` smoke +4; full **265/265** |
| v0.7.3 | **Artboard geometry on the undo stack.** The history snapshot now serializes `{shapes, artboards, active}` (was shapes-only) — `snapshot(shapes, artboards, active)` / `restoreHist` set & clamp all three (invalid active/selArtboard fixed up, `nextArtboardId` kept ahead). `addArtboard`/`deleteArtboard` `pushHist()` before mutating; an artboard move captures a pre-drag snapshot (`movingArtboard.snap`) and commits one entry on release if it moved. So add/move/delete artboards undo/redo like shape edits. All existing `snapshot(S.shapes)` call sites still work (artboards default to current). `artboards` smoke +7 (undo/redo of add/move/delete); full **261/261** |
| v0.7.2 | **Layers panel grouped by artboard.** Shapes nest under collapsible artboard group headers in the Layers panel; a shape's group is positional (`shapeArtboardId` = top-most artboard containing its centre, else "Not on an artboard"). Single-section docs (one artboard holding everything) still render a flat list. ▲/▼ and drag-reorder are now **group-aware**: `reorderLayer` swaps with the nearest same-group neighbour (skips other artboards), and cross-group drops are rejected (membership is positional, not stored). Collapse state in `S.layerCollapsed`; `toggleLayerGroup(key)`. Row markup factored into `layerRowHTML`. `layer-groups` smoke feature (7 asserts); full **254/254** |
| v0.7.1 | **Multi-page print/export per artboard.** `printPattern` now emits **one sheet per artboard** at true mm scale: renders at pan0/zoom1, then `buildPrintPages()` clones the SVG once per artboard into a hidden `#print-root`, each `.print-page` framed by a viewBox over that artboard's region + an mm-sized box + a named `@page abpN{size}` (Chromium named pages); a print stylesheet hides the live UI. `exportSVG` exports the **active artboard's** region (clipped, true scale; switch active + re-export for others). Shared helper `artboardSVGClone(ab)` frames + strips screen-only aids; page outline now carries `.artboard-rect`/`.artboard-label` classes and is hidden in print + removed from exports. `artboards` smoke +7 (print/export build); full **247/247** |
| v0.7.0 | **Multiple artboards (first cut, save v13).** `S.page` is now a getter → the active artboard; `S.artboards[]` (`{id,name,preset,orient,w,h,x,y}`) + `S.activeArtboard`/`nextArtboardId`. New **Artboard tool** (toolbar ⛶ / key **A**): click selects + makes active, drag repositions (artboards only — shapes can't be nudged). **Artboards panel** (add/select/delete; ● = active). `renderContent` draws every artboard at its offset (active/selected highlighted). Old v1-12 files migrate (single `settings.page` → `artboards[0]` at origin). `getFitBox` makes Fit-All frame all pages; `getBBox` stays shapes-only. Print targets the active artboard's region. **Deferred follow-ups:** multi-page print/export per artboard; Layers-panel grouping (layers nested under their artboard). Artboard geometry isn't in shape-undo yet. `artboards` smoke feature (18 asserts); full **240/240** |
| v0.6.3 | **In-app help overlay.** A themed, scrollable **Help & Keyboard Reference** (`#help-bg`/`.help-panel`, `openHelp`/`closeHelp`/`isHelpOpen`/`toggleHelp`) opened by the **`?` key** (from anywhere on the canvas) or the **? button** pinned to the bottom of the toolbar (`#tb-help`). Owns the keyboard while open (Esc or `?` closes; backdrop click closes). Tool-by-tool walkthrough + shortcut tables (multi-column via CSS `column-width`) + stitch-workflow and print-to-cut prose, folded from `SHORTCUTS.md`. Light/dark aware. `help` smoke feature (7 asserts); full **222/222** |
| v0.6.2 | **Light mode.** New `S.light` theme flag toggled by a **standalone pill switch in the top-right of the menubar** (`#theme-toggle`, label reads "Dark Mode"/"Light Mode" for the current state), persisted to `localStorage['lpat-theme']`, default dark. (Also realigned the View dropdown: labels left, checkmarks right-aligned via `margin-left:auto` on `.kb`/`.m-chk`, chk spans moved to item end, `.m-nest>.m-act{flex:1}`.) Implemented as an **additive `body.light` CSS override block** (dark rules untouched) plus theme-aware JS-painted SVG colours (`applyTheme`/`toggleTheme`/`restoreTheme`): grid-off fill, grid-pattern lines (`#pgm-p`/`#pgM-p` via CSS), rulers, page label, dim-overlay + pen-hint text all branch on `S.light` at render time. The red accent is intentionally shared by both themes; print is unchanged (always black). UI-only, no save-format change. Smoke **215/215** |
| v0.6.1 | **In-app themed dialogs + home polish.** Native `confirm()`/`alert()` replaced by an in-app dialog (`#confirm-bg`, `confirmModal`/`alertModal`) framed in french stitching (New-file discard, pen-discard, file errors). The launch auto-save prompt is gone — recovery is now a **Restore card** on the welcome screen (`readAutoSaveInfo`→`S._launchRecovery`→`recoverAutoSave`), so opening the app never blocks; `doAutoSave` pauses while Home is open. **Home moved to a toolbar button** (`#tb-home`, above the tools) out of the File menu. `home` smoke +8 (19); full **215/215** |
| v0.6.0 | **Home / welcome screen** (`#home`). Launch overlay: "Welcome to Leather Pattern Designer", **New File** + **Open File** buttons (= the menu actions), and a **Recent files** list. Recents are `FileSystemFileHandle`s persisted in **IndexedDB** (`addRecent`/`getRecents`/`openRecent`) for one-click reopen; degrades gracefully where the FS Access API is absent. Decorative **french-stitch border** (`renderHomeStitch`). Shown on load unless an autosave was recovered (`checkAutoSaveRecovery` now returns a bool); also File ▸ Welcome Screen. No save-format change. `home` smoke feature (11 asserts); full **207/207** |
| v0.5.2 | **9-point text alignment** (save v12). Added `valign` (top/middle/bottom) alongside `align`; `renderText` positions the wrapped block vertically (`blockTop`). The L/C/R row became a Figma-style **3×3 grid** (`#pi-align-grid`, `setTextAnchor(v,h)`) covering all 9 box positions incl. true centre. `text` smoke +1 (25); full **196/196** |
| v0.5.1 | **Text alignment + fill toggle** (save v11). Text boxes gain `align` (left/center/right → `text-anchor`+x) and `fill` (bool; off = **outline-only/hollow** text, printed as a black outline via the `txt-hollow` class). New L/C/R align buttons + Fill checkbox in the Text props group; in-place editor `text-align` follows `align`. `text` smoke +6 (24); full **195/195** |
| v0.5.0 | **Text-box tool** (T) — wrap-bounded label boxes (save format v10). New `type:'text'` shape `{x,y,w,h,text,fontSize(mm),bold,italic,outline,outlineColor,outlineWidth,color}`; mm font fixed under box resize (resize only re-wraps); horizontal auto-wrap (`wrapTextLines`); fill colour from the shape palette + optional outline; bold/italic. Drag/click to create → opens an in-place `<textarea>`; double-click to re-edit. Layers like a shape but no opacity slider. `isTextLike` shares rect box logic. `text` smoke feature (18 asserts); full **189/189** |
| v0.4.11 | **Fix: stitch-hole bunching on mixed-radius rects.** `roundedRectPathPts` emitted two *coincident* anchors per corner; a zero-radius corner → zero-length segment → degenerate corner math → piled holes. Now a sharp (r=0) corner emits a **single `corner:true` anchor** (variable point count), so a mixed-radius rect stitches like the rect tool. Also de-dupes convert-to-path. `stitch-radii` regression feature (6 asserts); full 171/171 |
| v0.4.10 | **Shift constraints, split two ways:** (1) dragging a path control handle with **Shift** snaps its *angle* to 45° around the anchor (keeps length; anchor drags grid-snap) — `snapAngle`; (2) the **pen tool's Shift** now snaps the placed anchor to the **grid** (replaced the old segment angle-snap), so Shift = grid-snap consistently across the app. `pen-snap` feature renamed `pen-grid`; `path-handles` +2 asserts; full 165/165 |
| v0.4.9 | **Direct handle editing (Illustrator white-arrow)**: drag a path control handle to reshape that side; on a smooth point the opposite handle rotates to stay collinear but **keeps its own length** (was a full mirror). **Alt-drag breaks the tangent** → a cusp (`corner:true` with extended handles, moved independently). Cusps keep their extended handles visible/grabbable (`cpOff`). `path-handles` smoke feature (11 asserts); full 163/163 |
| v0.4.8 | **Pen QOL: click = corner, click-drag = smooth** — anchor sharpness is decided by gesture, so the `corner` flag always matches the geometry. Retired the Smooth/Corner **mode** (Tab toggle, panel button, `S.penSmooth`, `togglePenSmooth`). `pen-anchor` smoke feature (8 asserts); full 152/152 |
| v0.4.7 | **Duplicate shape** (`Ctrl+D`): deep-clones the selection, offsets 5mm down-right, selects the copies (cascades on repeat); works on multi-select + rotated shapes. `duplicate` smoke feature (12 asserts); full 144/144 |
| v0.4.6 | Rotate snap inverted: free rotation by default, **Shift snaps** to `S.rotStep`° (was the reverse) |
| v0.4.5 | On-shape label outline → fixed-px non-scaling halo (0.7/0.55px, matches the shape outline at any zoom); toolbar regrouped — Select · Rotate (interaction) │ Rectangle · Pen (shape) |
| v0.4.4 | French stitch slit resized to a Vergez Blanchard-referenced **1.2 × 0.35 mm at 30°** (`stitchHole` `L=0.6,W=0.175,rotate(deg-30)`) — prints true 1:1 to match the physical iron |
| v0.4.3 | Default stitch hole style → **French** (matches the user's pricking irons; loaded files keep their saved style); French slit mirrored to a straight/"droite" slant (`stitchHole` `rotate(deg-35)`) |
| v0.4.2 | Rotation polish: resize/edge cursors follow the shape's rotation (`dirCursor`/`rotDirCursor` rotate the handle axis → matching bidirectional cursor); Shape-Properties subcategories spaced out + divider rule under each `.p-grp` heading; on-shape label outline halved (`fs*0.03`). Smoke 132/132 |
| v0.4.1 | **Rotation pivot fix**: geometry edits freeze the rotation pivot (`beginEditPivot`) so resizing a rotated shape keeps the opposite corner fixed; `rebakeEditPivot` folds `(Rot−I)(C−P)` back in on release. **Shape Properties panel reorganised** into Figma-style subcategories (Name → Position X\|Y → Size W\|H → Rotation → Corners → Appearance) with paired two-column rows. Smoke 127/127 |
| v0.4.0 | **Rotate shapes** (save format v9): `rot` field → SVG `rotate(deg cx cy)` transform, geometry stays unrotated, input de-rotated via `toLocal`. **Rotate tool** (R; Rectangle moved to **B**) + **corner-rotate ring** in the Select tool (`hitRotateZone`, custom `ROTATE_CURSOR`). 15° snap by default (Settings → **Rotate snap (°)** = `S.rotStep`, 0 = free; Shift = bypass). **Rotation°** field in the props panel. `worldAABB` makes fit/snap/marquee/print rotation-aware. `rotate` smoke feature (17 asserts); full 124/124 |
| v0.1 | Select/Rect/Circle tools, pan/zoom, stitch, history, save/load, SVG export, print |
| v0.2 | Collapsible side panel, View+History moved to menu bar, dim overlay on drag, snap size presets in View menu |
| v0.2.1 | Fixed dim overlay font (was 3px, now `dimFontSize` default 13px matching props panel) |
| v0.3 | Auto-save to localStorage, Pen/Bezier tool with cursor tooltip + smooth/corner toggle, path editing handles, stitch on paths |
| v0.3.1 | Fixed path not selectable after drawing (cancelPen bug), fixed preview contrast (was ~0.1px), improved hit testing |
| v0.3.2 | Area-based selection for closed paths (ray-cast), hover highlight + cursor feedback, circular hit testing for handles |
| v0.3.3 | Smoke tests (headless Edge): `/smoketest-quick` + `/smoketest-full` |
| v0.3.4 | Rulers (Ctrl+R, screen-space ticks + cursor marker); selectable page size (A4/A3/Letter/Tabloid/Custom + orientation); `@page` print size sync; save format v4 |
| v0.3.5 | Internal cleanup only (no behaviour change): history snapshot dedup + removed redundant double-clones; cached status-bar DOM refs (`ST`) so the hot mousemove path stops re-querying the DOM |
| v0.3.6 | Shift = momentary grid-snap while dragging; smart stitch alignment forcing holes onto harsh corners (highlighted teal + tooltip); renamed position fields (Position/Center X·Y); stitch hole styles round/diamond/french; save format v5 |
| v0.3.7 | Stitch fix: rect edges now march at the true spacing from each corner (was even per-edge division), so the run between corners holds the exact `sp` and the leftover is one short gap at the corner |
| v0.3.8 | Hole-style chooser added to the Stitching panel; Stitching panel hidden until a shape is selected; on-shape printable piece labels (name + live dimensions, mm-sized) editable in the panel or by double-clicking a shape; save format v6 |
| v0.3.9 | Edge selection (click an edge of the selected shape) + drag to reposition (rect edge = resize side, path segment = move its anchors); per-edge stitching — choose which sides get stitch lines via `sh.stitchEdges` (undefined = all); master "Stitch all edges" + per-edge toggle |
| v0.3.10 | Auto-save default 30 s → 5 min; interval is now a stepped dropdown (`AUTOSAVE_OPTS`: Off / 5·10·15·30·45 min / 1–6 h); loaded values snap to nearest via `nearestAutosave` |
| v0.3.11 | Per-feature smoke tests (`FEATURES` registry + `-Feature` flag); "Clear auto-save cache" button; per-shape outline colour (`SHAPE_COLORS` palette); Figma-style snap-to-other-shapes while moving (`computeSnap`, magenta guides, `S.snapShapes`); save format v7 |
| v0.3.32 | Resizable right panel: drag handle (`#props-resize`) between canvas and `#props`; `startPropsResize` adjusts width (clamped 180–520 px, drag-left = wider), persisted to `localStorage['lpat-props-w']` and restored on load via `restorePropsWidth`. UI-only, no smoke |
| v0.3.31 | Internal cleanup (no behaviour change): de-duplicated the shape render loop into `shapeGeo`/`shapeBody`/`stitchFor` + `rectRounded` (4 near-identical branches → ~7-line loop); `convertToPath` reuses `rectRounded`+`makePt`; smoke harness point-makers consolidated into shared `corner`/`smooth` wrappers over `makePt`. Smoke 107/107 |
| v0.3.30 | **Layers panel**: each shape is a layer (list shows top-most first); reorder by **dragging the ⠿ grip** (`reorderLayerTo`) or ▲/▼ (`raiseLayer`/`lowerLayer`), one undo, boundary/self no-op; per-shape **fill-opacity** slider (`sh.opacity` 0–1, absent=0) → `fillOpacityOf` drives fill solidity (0 = outline-only, 1 = solid; stitch/label stay on top); click a row to select. Save format v8 |
| v0.3.29 | Save vs Save As: `S.fileHandle` remembers the open/saved file so plain Save (Ctrl+S) re-writes it silently; Save As (Ctrl+Shift+S) re-prompts; Open uses `showOpenFilePicker` to set the target; falls back to download/`<input>` without the FS Access API |
| v0.3.28 | Print now follows the artboard at true scale: `printPattern` resets pan/zoom and sets a temporary `#cvs` `viewBox` of the artboard region so A4 prints A4 / A3 prints A3 (off-artboard content clipped); was capturing the live screen view |
| v0.3.27 | Stitching panel: Margin is now a free numeric input; Spacing is a stitching-iron dropdown (2.7/3.0/3.38/3.85 + Custom). `applySpacingPreset`; no save change |
| v0.3.26 | Gentler shape-snap tied to `snapMM` (`clamp(snapMM·2.5,3,7)`px, was 7); artboard **Name** (`S.page.name`) → default doc filename via `docName()` + shown on the caption; corner stitch holes orient to an **edge** again (reverted v0.3.19 bisector) so they match the run |
| v0.3.25 | Save (.lpat) + Export SVG prompt for name/location via `showSaveFilePicker` (`saveBlob` helper; falls back to download, ignores cancel) |
| v0.3.24 | Multi-select: `selIds` array is source of truth, `selId` is a derived getter (primary); Shift-click toggle + rubber-band marquee (`shapesInBand`) + group move (`placeShape`, one undo) + group delete; on-shape labels render as screen outlines (hollow); edge hitbox 6→10px |
| v0.3.23 | On-shape labels wrap (`wrapToWidth`) + shrink-to-fit ~80% of the box via canvas text measurement (`measureTextW`); never overrun the piece/stitching, never grow past `labelMM` |
| v0.3.22 | Harsh corners detected **geometrically** (tangent turn > `HARSH_ANGLE` ~34°), not from the `corner` flag — pen-smooth-mode clicks make `corner:false` coincident-handle anchors that are geometrically sharp and were bypassing all corner handling (the real cause of recurring corner bunching) |
| v0.3.21 | Fixed doubled/bunched stitch holes at corners: the inward-offset path backtracked at miter corners (corner inset further than its neighbour samples), corrupting even-distribution; now trims offset samples that fall outside the mitered corner so each edge runs clean corner-to-corner (guide path rebuilt from it too) |
| v0.3.20 | Artboard label legible (`font-size` was a fixed 3px → 12px) |
| v0.3.19 | Corner stitch holes orient to the **bisector** of their two edges (clean picture-frame diagonal) instead of one edge — fixes french/diamond slits crossing the edge run at corners; `bisect()` in both `stitchRect`/`stitchPath`, wrap+seam-aware on closed paths |
| v0.3.18 | Diamond hole style removed (round/french only; render fallback kept); stitch holes drawn as outlines (`fill:none`+thin stroke) not solid; pen Shift snaps the segment to 0/45/90° via `penPoint` |
| v0.3.17 | Stitches distribute **evenly** between corners (`N=round(len/sp)` equal steps, both endpoints hit) so parallel edges align — replaces v0.3.7 remainder-at-far-corner; same scheme in `stitchRect` and per-run in `stitchPath` |
| v0.3.16 | Selected-edge highlight is now a glowing magenta halo + bold core (was thin gold); circle **tool** removed (button + `C` shortcut) but all circle logic (render/stitch/convert/load) kept so saved circles still work |
| v0.3.15 | Per-anchor corner/smooth conversion: click a path point to select it (`S.selAnchor`, gold highlight), Corner/Smooth buttons in the Bezier Path panel (`setAnchorType`); corner collapses handles, smooth synthesises Catmull-Rom handles; resize mouseup no longer pushes no-op history |
| v0.3.14 | Stitch fix: sharp-corner path anchors get a true miter offset (`p+m·(n1+n2)/(1+n1·n2)`) so converted/pen squares inset corners by `m` from both edges, matching `stitchRect`; hole *angles* now read from original `samples` (not offset), forced corner holes orient to one edge (out/in), and the march no longer places a duplicate regular hole at a harsh corner; miter length capped at `2·m` (acute corners bevel, no centroid spike); min-gap pass culls holes closer than `sp/2` with a backward cascade (forced corner wins) |
| v0.3.13 | Stitch fix: smooth bezier corners (`corner:false`) now flow through without a forced dot at the anchor tip; only harsh corners and run boundaries reset the march |
| v0.3.12 | Per-corner radius on rects (`sh.radii=[tl,tr,br,bl]`, capped at min(w/2,h/2)); rounded rects render via arc-path, stitch via 8-pt bezier path (`roundedRectPathPts`); "Convert to editable path" button for rects and circles — bakes geometry to `type:'path'` in-place (undoable) |

---

## Planned backlog (priority order)

### Near-term
0. ✅ **Layers panel** — DONE v0.3.30. Each shape is a layer; reorder by drag-grip or ▲/▼;
   per-shape fill-opacity (`sh.opacity` → `fillOpacityOf`; 0 = outline, 1 = solid). _Follow-up:
   per-layer hide/lock._
1. ✅ **Smoke tests** — DONE in v0.3.3, feature-scoped in v0.3.11. Headless Edge:
   - `/smoketest-quick` (core+history, ~5s) and `/smoketest-full` (107 asserts, ~15s)
   - Per-feature runs: `run-smoke.ps1 -Feature "<names>"` (see `FEATURES` registry).
   - Runner: `tests/run-smoke.ps1`; logic: `tests/smoke-harness.js`. All passing.
2. ✅ **UX guide / in-app help** — DONE v0.6.3. `?`-key (and toolbar **?** button) overlay with
   tool-by-tool walkthrough, shortcut tables, stitch workflow, and print-to-cut prose, folded from
   `SHORTCUTS.md` (which stays as the long-form reference). _Possible follow-up: contextual deep-links
   per tool, or a short first-run tip._
3. ✅ **Stitch corner treatment** — DONE v0.3.6. Holes are forced onto harsh corners
   (rect corners + `corner:true` anchors), highlighted in teal with a tooltip; the
   resulting uneven spacing is intentional. _Possible follow-up: tune the remainder
   distribution per arc, and let diamond/french holes follow tighter on acute turns._

### Medium-term
4. **Spline close enforcement** — ensure first/last anchors snap cleanly when closing
5. **Multi-select** — rubber-band selection box + Shift+click
6. ✅ **Duplicate shape** — DONE v0.4.7. `Ctrl+D` clones the selection (offset 5mm,
   copies selected). _Possible follow-up: Alt-drag to duplicate-and-move._
7. **Corner ↔ Smooth toggle** — double-click anchor in select mode to switch; currently all edits are smooth-reflected

### Longer-term
8. ✅ Custom page size (A4/A3/Letter/Tabloid/custom + orientation) — DONE v0.3.4
9. ✅ Ruler overlay (Ctrl+R) — DONE v0.3.4
9b. **Multiple artboards** — IN PROGRESS v0.7.0 (first cut). **Agreed design:**
    artboards are selectable/movable ONLY via a new **Artboard tool** (so they
    can't be nudged while editing shapes). `S.artboards[]` (each `{id,name,preset,
    orient,w,h,x,y}`) + `S.activeArtboard`; `S.page` is now a getter → the active
    artboard, so existing page code keeps working. Old single-page files migrate by
    wrapping `S.page` as `artboards[0]` (save format **v13**). **Split into stages:**
    (a) data model + migration + Artboard tool + render-multiple-pages = first cut;
    **(b) multi-page print/export per artboard = DONE v0.7.1**; **(c) Layers panel
    grouping — layers nest as children under their artboard, shapes outside any artboard
    stay top-level = DONE v0.7.2** (`shapeArtboardId`/`renderLayers`/`layerRowHTML`;
    group-aware reorder; single-section docs render flat; `layer-groups` smoke feature).
    Grouping is positional (follows the shape's geometry) — moving a shape between
    artboards via the panel is intentionally not supported.
10. Named layers / groups
11. Per-shape label / notes field
12. Stitch density preview (show estimated total hole count)
13. **Multi-file tabs** — a tab strip for several open `.lpd` files at once (each a
    full document: own `S.shapes`, undo stack, page, file handle). Likely refactors
    today's single global `S` into a per-document state + an `S.docs[]`/`activeDoc`
    layer, with the tab bar switching the active document. Pairs with the desktop
    build (a real app window wants tabs). Plan as its own milestone — it touches
    save/load, autosave, history, and render. **(requested — desktop-era feature)**
14. **"View in Leather Studio 3D" / Export-to-3D button** — hand the current `.lpd` to the 3D
    companion and open it; reuses the existing `open-lpd`/`take_launch_file` launch contract. Simpler
    "Export to 3D" (write a copy, don't launch) first. **(requested — desktop-era; not started)**
15. **Live preview on save** — keep the 3D viewer open and auto-refresh it when the `.lpd` is saved
    (file-watch or IPC). Sequence after #14. **(requested — desktop-era; not started)**
    _Both detailed in DEVLOG → Roadmap → "LPD ↔ Leather Studio 3D bridge"; the seam/assembly model
    they build toward is designed in `MD files/SEAM-MODEL.md` (schema v15)._

### Desktop build (Tauri) — see `desktop/README.md`
D1. ✅ **Native save / load DONE v0.7.12.** Was: the packaged Tauri/WebView2 window dropped save/load to
    the browser download path (no native picker, no silent re-save). Now: `src-tauri/main.rs` adds
    `save_file(path, contents)` + `read_file(path)` commands (`std::fs` wrappers, `Result<_,String>`), and
    `take_launch_file` returns `[path, contents]` so the frontend can remember where to save back.
    **`tauri-plugin-dialog`** added (`Cargo.toml` + `.plugin(...)` + `"dialog:default"` capability) for the
    native Save/Open pickers, reached via the existing `withGlobalTauri` as `window.__TAURI__.dialog`.
    Frontend: `S.nativePath` (mirrors `S.fileHandle`), helper layer `isDesktop()`/`tauriInvoke`/
    `tauriPickSavePath`/`tauriPickOpenPath`/`saveFileNative`/`triggerLoadNative`, and a one-line
    `if(isDesktop())` branch at the top of `saveFile`/`saveFileAs`/`triggerLoad`. **Browser FS-Access +
    download paths untouched** (one codebase, two backends); helpers degrade to a download if the dialog
    global is missing. _Not yet routed through Tauri: SVG **export** (still uses `downloadBlob`) — a minor
    follow-up._ Desktop path is build-only; verify `.lpd` round-trip on the next `/build`.
D2. Native menu bar / auto-update channel. **File association for `.lpd` is registered** (v0.7.10,
    `bundle.fileAssociations`). ✅ **Open-on-double-click DONE v0.7.11** (cold start): `src-tauri/main.rs`
    reads the `.lpd` path from argv (the association launches `"...exe" "%1"`), and exposes it via the
    `take_launch_file` command; `tauri.conf.json` sets `app.withGlobalTauri:true` so the no-build frontend
    can `window.__TAURI__.core.invoke` it. Frontend `openTauriLaunchFile()` (end of init, after `showHome`)
    loads the JSON + `hideHome()`; no-op in a plain browser. ✅ **Save-back DONE v0.7.12** (see D1).
    ✅ **Single-instance DONE v0.7.12**: `tauri-plugin-single-instance` (registered first) focuses the
    running window and `emit`s `open-lpd (path, content)` for a 2nd `.lpd` launch; frontend
    `listenForSecondInstance()` → `onSecondInstanceFile` loads it into the existing window (confirms
    discard if the current doc has shapes). No 2nd window, no autosave-key clobber.
D3. Replace the placeholder icon (`desktop/icon-source.png`) with a real logo.

---

## User preferences observed this session

- Prefers short, punchy iterations — fix one thing, ship it, move on
- Likes the DEVLOG versioning pattern — keep updating it each session
- Wants dim overlays readable without squinting (font ≥ 13px)
- Will fine-tune stitch corner behaviour later — don't over-engineer it now
- Plans to add spline complexity over time, not all at once
- Smoke tests should be callable by specific slash commands (two tiers)
