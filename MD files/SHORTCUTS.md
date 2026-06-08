# Leather Pattern Designer — Keyboard & Mouse Reference
_v0.8.1_

---

## Tools

| Key | Tool |
|-----|------|
| `V` | Select / Move |
| `B` | Rectangle (box) |
| `P` | Pen / Bezier |
| `T` | Text box |
| `R` | Rotate |
| `A` | Artboard (select / move / add pages) |
| `S` | Seam — mark edges that join (for 3D assembly preview); group them in the Assembly panel |

---

## File

| Shortcut | Action |
|----------|--------|
| — | Welcome screen — New / Open / Recent files / Restore auto-save _(shown on launch; reopen via the **Home button** at the top of the toolbar)_ |
| `Ctrl+N` | New file — opens a **new tab** (reuses the current tab if it's empty; nothing is discarded) |
| `Ctrl+T` | New tab _(desktop app; browsers reserve this combo)_ |
| `Ctrl+W` | Close the current tab (confirms if it has shapes; closing the last leaves one blank doc) |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Cycle to the next / previous tab _(desktop app)_ |
| `Ctrl+S` | Save `.lpd` — re-writes the current file silently (prompts if none yet) |
| `Ctrl+Shift+S` | Save As… — always prompt for a new name/location |
| `Ctrl+O` | Open `.lpd` — opens in a **new tab** (the opened file becomes that tab's Save target) |
| `Ctrl+P` | Print / Save PDF — **one sheet per artboard**, each at true mm scale |
| — | Export SVG _(File menu only)_ |
| — | **Tabs:** click a tab to switch · ✕ to close · **+** for a new document _(strip under the menu bar)_ |

---

## Edit

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+D` | Duplicate selection — copies offset 5 mm down-right; copies become selected (repeat to cascade) |
| `Del` / `Bksp` | Delete selected shape |
| — | Settings: history, stitch, snap, font size, auto-save _(Edit → Settings)_ |

---

## View / Navigation

| Shortcut | Action |
|----------|--------|
| `?` | Open the in-app Help & Keyboard Reference overlay (Esc or `?` again closes; also the **?** button at the bottom of the toolbar) |
| `Scroll wheel` | Zoom toward cursor |
| `+` / `=` | Zoom in (centred) |
| `-` | Zoom out (centred) |
| `F` | Fit all shapes in view |
| `0` | Reset view (100%, top-left) |
| `Space + drag` | Pan canvas |
| `Middle mouse + drag` | Pan canvas |
| `G` | Toggle grid |
| `Ctrl+R` | Toggle rulers (top + left, mm scale, live cursor marker) |
| `Shift+S` | Toggle snap to grid |
| `Shift` _(hold while dragging)_ | Momentary snap-to-grid — snaps the dragged shape / anchor / handle / new shape to the grid even when snap is off |
| — | Snap size presets: 0.5 / 1 / 2 / 5 / 10 mm _(View menu)_ |
| — | Toggle page boundary _(View menu)_ |
| — | Page size: A4 / A3 / Letter / Tabloid / Custom + Landscape _(View menu; Custom in Settings)_ |

---

## Select Tool

| Action | Result |
|--------|--------|
| Click shape | Select it |
| `Shift` + click shape | Add / remove it from the selection (multi-select) |
| Drag on empty space | Rubber-band marquee — selects every shape it touches (`Shift` adds to current) |
| Double-click shape | Edit its label (piece name) in place — Enter to commit, Esc to cancel. A **text box** opens its content editor instead |
| Click inside closed path | Select it (area hit) |
| Click empty space | Deselect |
| Drag selected shape | Move it; with several selected, drags the whole group together |
| `Alt` + drag shape | **Duplicate-and-move** — drags a copy and leaves the original in place (works on a multi-selection too). One undo step |
| `Shift` + drag shape | Bypass shape-snap; use plain grid snap instead |
| Click an edge _(of the selected shape)_ | Select that edge (highlights gold) |
| Drag a selected edge | Reposition it — rect side resizes, path segment moves |
| `Esc` _(edge selected)_ | Step back out to the whole shape |
| Hover shape _(unselected)_ | Cyan outline preview + pointer cursor |
| Hover edge _(selected shape)_ | Cyan edge preview + resize/move cursor |
| Hover handle | Handle turns gold, cursor changes |
| Drag corner/edge handle | Resize rect |
| Drag `r` handle (circle) | Resize radius |
| Drag anchor square (path) | Move anchor + both handles together |
| Click anchor square (path) | Select that point (gold) → **Corner / Smooth** buttons appear in the Bezier Path panel |
| Drag orange cp handle (path) | Reshape that side of the curve; on a smooth point the opposite handle rotates to stay smooth but keeps its own length |
| `Shift` + drag cp handle (path) | Snap the handle's **angle** to 45° increments around its anchor (keeps its length) |
| `Alt` + drag cp handle (path) | **Break the handle** — move it independently of the other side (makes a cusp). Like Illustrator's white-arrow Alt-drag |

**Cursor guide (select tool)**

| Cursor | Meaning |
|--------|---------|
| `pointer` | Hovering a selectable shape |
| `move` | Hovering a path anchor |
| `crosshair` | Hovering a bezier control handle |
| `nw-resize` etc. | Hovering a rect corner/edge handle |
| `ew-resize` | Hovering a circle radius handle |
| rotate arrow | Hovering the ring just outside a selected shape's corner |

---

## Pen / Bezier Tool

| Action | Result |
|--------|--------|
| `Click` | Place a **corner** anchor (sharp, straight segments) |
| `Click + drag` | Place a **smooth** anchor; the drag sets the handle direction → S-curve |
| `Shift` _(hold)_ | Snap the anchor to the grid as you place it |
| `Enter` | Finish path (open) |
| `Double-click` | Finish path (open) |
| Click first anchor _(≥ 2 pts placed)_ | **Close** and finish — a green ring + floating **○** cue appears as the cursor nears the first anchor, and the preview snaps to it. Any **smooth** first/last anchor gets a true tangent-continuous handle so the loop closes without a kink (corners stay sharp) |
| Click an open path's **end anchor** _(idle pen)_ | **Resume** that path — continue adding points from its endpoint (a cyan ring cue shows on hover). Un-rotated open paths only |
| **Drag** an open path's **end anchor** _(idle pen)_ | Resume **and** set that endpoint's outgoing handle from the drag, so the continuation flows out smoothly |
| `Backspace` | **Undo the last placed anchor** (pen-only — never touches document undo/redo) |
| `Esc` / `Del` | Cancel / discard in-progress path |

A **magenta crosshair + square** marks exactly where the next anchor will drop (helpful with
`Shift` grid-snap on). Corner vs. smooth is decided **by gesture, not a mode** — a plain click is a
corner, a click-drag is a smooth curve (drag back onto the anchor before releasing to keep it a corner).
Any anchor can be switched later with the **Corner / Smooth** buttons (select the path, click an anchor).

After finishing, the path is immediately selected and editable with the Select tool.

---

## Text Tool (`T`)

| Action | Result |
|--------|--------|
| Drag out a box | Create a text box at that size, then start typing |
| Click _(no drag)_ | Create a default-size text box, then start typing |
| _(after creating)_ | Tool drops to **Select** so the box can be moved/edited right away |
| Double-click a text box _(Select tool)_ | Re-open its content editor |
| `Enter` _(in editor)_ | New line |
| `Ctrl/Cmd+Enter` or click away | Commit the text (one undo entry) |
| `Esc` _(in editor)_ | Cancel the edit (revert) |

Text **wraps horizontally** to the box width automatically. **Resizing the box only changes its
bounds and re-wraps — the font size never scales** (set font size in mm in the Properties panel).
Properties: font size (mm), **Bold** / *Italic*, **Align** — a Figma-style **3×3 grid** giving all
9 box positions (top/middle/bottom × left/center/right, incl. true centre), **Fill** (on/off — turn
it off for **outline-only/hollow** text), **Outline** (on/off + width + colour), and text **Color**
(shared shape palette). Filled text prints solid black at true size;
outline-only text prints as a black outline; the dashed box frame is screen-only. In the Layers
panel a text box behaves like any shape (name, colour swatch, reorder) but has **no fill-opacity
slider**.

---

## Artboard Tool (`A`)

| Action | Result |
|--------|--------|
| Click an artboard | Select it + make it the **active** page (Settings ▸ Page edits its size/name; it's what prints) |
| Drag an artboard | Reposition the page on the canvas (Shift / snap-grid applies) |
| `Del` | Delete the selected artboard (always keeps at least one) |
| `Ctrl+Z` | Add / move / delete artboard is undoable, same as shape edits |
| Click empty space | Deselect |

Artboards can only be selected/moved with this tool, so they can't be nudged while editing
shapes. Add / select / delete artboards in the **Artboards** panel (right side); the **+ Add
Artboard** button drops a new page to the right. **Print (`Ctrl+P`) emits one sheet per artboard**,
each at true mm scale. **Export SVG** asks (when there's more than one artboard) whether to export
**all** artboards as separate files or just the **active** one. The dashed page outline is a screen
aid — it never prints/exports.

---

## Rotate Tool (`R`)

| Action | Result |
|--------|--------|
| Click + drag a shape | Rotate it freely about its centre (any angle) |
| `Shift` + drag | Snap to the **Rotate snap** increment (15° by default) |
| Click empty space | Deselect |

**You can also rotate without switching tools:** with the **Select** tool, hover the ring
just *outside* a selected shape's bounding-box corner — the cursor becomes a rotate arrow —
then drag. (Works for paths and odd shapes too; the resize handles still win when you're right
on the corner.) Set the angle numerically anytime via the **Rotation°** field in the
Properties panel.

---

## Properties Panel

Shape Properties is grouped top-to-bottom: **Name** · **Position** (X | Y) · **Size** (W | H,
or Radius) · **Rotation** · **Corners** (rects) · **Appearance** (colour + type). Editing
Position/Size on a rotated shape keeps its far corner anchored (no pivot drift).

| Action | Result |
|--------|--------|
| Click section header | Collapse / expand that section |
| Edit X / Y / W / H / R fields | Update shape geometry (Enter to apply) |
| Edit Rotation° field | Set the shape's rotation angle directly (all shape types) |
| Click a Color swatch | Set the shape's outline colour (screen only — prints black) |
| Label field + "Show name + size" | Piece name printed on the shape, with live dimensions |
| "Stitch all edges" checkbox | Toggle stitch on every edge of the shape |
| "Stitch edge N" checkbox _(edge selected)_ | Toggle stitch on just that edge |
| Margin dropdown | 3 mm / 3.38 mm / Custom |
| Spacing input | Stitch hole interval in mm |
| Hole style dropdown | Round / Diamond / French _(global; mirrors Settings)_ |
| "Closed path" checkbox _(path only)_ | Connect last anchor back to first |

_The Stitching panel only appears while a shape is selected._

---

## Layers Panel

Every shape is a layer, grouped under its artboard (click a group header to collapse). Top row =
front-most.

| Action | Result |
|--------|--------|
| Click a row | Select that shape |
| Drag the ⠿ grip (or ▲ / ▼) | Reorder within its artboard group |
| **Eye icon** | Hide / show the layer — hidden layers aren't drawn, selectable, or printed |
| **Lock icon** | Lock / unlock — a locked layer stays visible but can't be selected or moved |
| Fill slider | Fill solidity: 0 = outline only, 100 = solid _(not on text boxes)_ |

_Hiding or locking the selected shape deselects it. Re-show / unlock from the same row icons._

---

## Settings (Edit → Settings)

| Setting | Range | Default |
|---------|-------|---------|
| Auto-save interval | Off / 5·10·15·30·45 min / 1–6 h | 5 min |
| Clear auto-save cache | _(button)_ wipes the localStorage recovery snapshot | — |
| Undo limit | 10 – 500 steps | 100 |
| Default stitch margin | ≥ 0.5 mm | 3 mm |
| Default stitch spacing | ≥ 0.5 mm | 3.38 mm |
| Stitch hole style | round / diamond / french | french |
| Snap size | ≥ 0.1 mm | 1 mm |
| Snap to other shapes | on / off | on |
| Rotate snap | 0–180° (Shift-snap increment; 0 = off) | 15° |
| Dimension label font | 8 – 48 px | 13 px |
| Shape label size | 1 – 50 mm | 5 mm |
| Page size / orientation | A4/A3/Letter/Tabloid/Custom · Portrait/Landscape | A4 portrait |

---

## Status Bar (bottom)

```
Tool: Select  |  X: 25.3  Y: 10.1  |  Zoom: 150%  |  Snap: 1mm  |  Shapes: 4  |  History: 12/100  |  Auto-saved 8s ago
```

---

## Stitch Presets Reference

| Preset | Use case |
|--------|----------|
| **3 mm margin** | Standard saddle stitch on vegetable-tanned leather |
| **3.38 mm margin** | Matches common 4-spi (4 stitches per inch) overstitch wheel |
| Custom | Set any margin in the Properties panel |

Stitch spacing (hole interval) is independent of the margin — set both separately per shape.

**Corner holes:** sharp corners always get a stitch hole, highlighted in teal (hover for an explanation). Spacing into/out of a corner may be uneven by design — that matches hand-stitching. Hole shape (round / diamond / french) is a global choice in Settings.

---

## Save / Export Formats

| Format | Use |
|--------|-----|
| `.lpd` | Native save ("Leather Pattern Document") — reopens with full edit capability |
| `.svg` | Vector export at true mm scale (clipped to the page) — open in Inkscape, Illustrator, or browser. With several artboards, Export asks **All artboards** (one file each) or **Active only** |
| Print / PDF | `Ctrl+P` → browser print dialog → "Save as PDF". **One sheet per artboard** (each its own page size, true scale); UI + page outline hidden, shapes print in black, stitch marks in dark red |
