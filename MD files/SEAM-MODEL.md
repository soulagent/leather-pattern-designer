# Seam / Assembly Data Model — `.lpd` schema v15 (design)

_Status: **design / not yet implemented**. Authored 2026-06-08. Owner format: the Leather Pattern
Designer (`.lpd`). Read-only consumer: Leather Studio 3D._

This is the **Phase-2 gate** for the 3D companion (see `companion-3d-app` memory + Leather Studio 3D
`MD files/CONTEXT.md` "The crux"). Today's `.lpd` is purely 2D — cut shapes + per-edge stitch lines —
with **no assembly metadata**: nothing records which edge joins which, where folds are, or material
thickness. Folding flat pieces into an assembled 3D product, generating build instructions, and
validating that the flats actually fit are all impossible until that data exists. This doc defines it.

---

## 1. Scope of v15

**In:** seams (edge↔edge joins, including N-way stacked seams), fold lines, per-piece material
thickness, and the minimal per-seam metadata the 3D preview + instructions generator need.

**Out (deliberately deferred):** the fold *solver* itself (constraint/physics), the instructions
*generator*, and bidirectional parametric sync. v15 is the **data**; the algorithms that consume it
are later phases. We design the data now so authoring UI (#9) and the 3D consumer (#10) have a stable
contract.

---

## 2. What the existing schema gives us (survey result, #7)

- **Stable shape identity.** Every shape has a numeric `sh.id` (`S.nextId++`); `buildSaveData()`
  serializes the whole shape via `clone(s)` plus the `nextId` counter, so `id` round-trips and is
  unique within a document (across all artboards). **Any new field added to a shape persists for
  free** — no save/load plumbing, only a version bump + default-on-load.
- **Edges are already addressable as `{shapeId, edgeIndex}`.** Per-edge stitching uses exactly this:
  `shapeEdgeCount(sh)` → **rect = 4**, **path = `points.length`** (closed) / `points.length-1` (open),
  **circle = 0**; `sh.stitchEdges` is an array of stitched edge indices. There is already a live
  selected-edge concept (`S.selEdge = {shape, edge}`) with a per-edge checkbox in the properties
  panel — the seam-tagging UI (#9) reuses this wholesale.
- **The 3D app shares the edge indexing for free.** Leather Studio 3D ported the stitch-edge kernel
  verbatim, so "edge 2 of shape 7" means the **same geometry** in both apps by construction. The seam
  model inherits that guarantee.

### Edge-reference contract (canonical)

An edge is `{shape: <id>, edge: <int>}`, interpreted identically in both apps:

| Shape type | Edge count | Edge `e` is… |
|-----------|-----------|--------------|
| `rect`    | 4         | `0`=top (TL→TR), `1`=right (TR→BR), `2`=bottom (BR→BL), `3`=left (BL→TL); clockwise from top-left in **unrotated local** space. |
| `path`    | `points.length` (closed) or `…-1` (open) | segment from `points[e]` → `points[(e+1) % n]`; cubic if the anchors carry control points. |
| `circle`  | 0         | **No edges** — cannot be a seam member in v15 (a circle joins only as a whole; deferred). |

Geometry is stored unrotated; the shape's `rot` is applied on top. The 3D consumer de-rotates exactly
as the 2D app does.

---

## 3. Design decisions (the three open questions, resolved)

### Q1 — Edge-index fragility → integer refs + a validation pass (MVP), anchor-ids as a later upgrade

Edge indices are **positional**, so a seam pinned to path edge 3 silently re-points if an anchor is
inserted/deleted *before* it. Rects (always 4) and finished pieces are safe; live path editing is the
risk.

**Decision:** v15 stores plain `{shape, edge}` integer refs and adds a **`validateSeams()`** pass
(run on load, and after any topology change — anchor add/delete, shape delete, path open/close) that:
prunes refs to deleted shapes, prunes refs whose `edge >= shapeEdgeCount(sh)`, drops now-empty seam
groups, and **flashes a warning** when it removes anything ("2 seam edges dropped — geometry changed").
This is recoverable by re-tagging and matches the house rule of not over-engineering deferred risk.

**Forward upgrade (only if it bites in practice):** give path anchors a stable `aid` and define a path
edge by its two endpoint `aid`s, so reordering and unrelated-edge edits never shift a seam. Documented,
not built.

### Q2 — Edge alignment/direction → geometric by default, optional `reversed` override

A tag says edges join, but not *how they line up*. Each edge has a natural direction (its traversal
order from the contract above). When the 3D app stitches two edges it matches them **end-to-end by
nearest endpoints** (geometric inference) and compares arc-lengths for the mismatch check (§7) — no
schema needed for the common case. For the cases the heuristic gets wrong (e.g. a deliberately
flipped/mirrored join), each member carries an optional **`reversed: true`** that flips its
parameterization. Default absent = auto.

### Q3 — Join type + metadata home → a top-level `assembly` registry (not scattered on shapes)

Seam metadata is about a *relationship*, not one shape, and the instructions generator wants a graph
to traverse. **Decision:** the canonical store is a **top-level `assembly` object**; shapes are NOT
tagged in the file (an edge→seam lookup map is derived in memory on load for the per-edge UI to
highlight — never duplicated on disk). A seam group carries a **`type`** (`stitch` | `fold` | `glue`)
and optional assembly `order`. **Tag-group backbone:** all member edges of one seam belong to the same
join — which natively handles **N-way stacked seams** (3+ panels meeting at one spine, e.g. the Hermès
Citizen Twill card holder) that a pairwise A↔B link cannot express.

Folds are kept as a **separate `folds[]`** list rather than forced into the seam model, because a fold
is a **crease across the interior of one piece** — generally *not* an existing boundary edge, so it
needs its own line geometry (two points in shape-local mm).

Per-piece **material thickness** lives on the shape as optional `sh.thickness` (mm), defaulting to the
3D app's global thickness when absent.

---

## 4. The v15 schema

Top-level additions to the existing save object (everything else unchanged from v14):

```jsonc
{
  "version": 15,                      // was 14
  "meta": { ... },
  "settings": { ... },
  "artboards": [ ... ],
  "shapes": [
    // …existing shape fields…
    { "id": 7, "type": "rect", "x": 0, "y": 0, "w": 90, "h": 60,
      "thickness": 1.6 }             // NEW (optional) per-piece material thickness in mm
  ],
  "nextId": 12,

  // NEW — all assembly metadata. Absent in v1–14 files → defaults to empty (back-compat).
  "assembly": {
    "version": 1,                     // internal assembly-schema version (independent of file version)
    "seams": [
      {
        "id": 1,                      // stable within the document
        "name": "spine",             // user-defined string label (the "tag"); editable, self-documenting
        "type": "stitch",            // "stitch" | "fold" | "glue"
        "order": 1,                   // optional assembly step ordering (for instructions); null = unordered
        "allowance": 4,               // optional seam allowance / margin in mm (defaults to defMargin)
        "notes": "",                 // optional freeform note surfaced in instructions
        "members": [                  // 2+ edges (N-way allowed). Each is an edge reference.
          { "shape": 7,  "edge": 1 },
          { "shape": 9,  "edge": 3 },
          { "shape": 11, "edge": 3, "reversed": true }   // optional alignment override (Q2)
        ]
      }
    ],
    "folds": [
      {
        "id": 1,
        "shape": 7,                   // the piece this crease lives on
        "a": { "x": 0,  "y": 30 },    // crease endpoints in the shape's LOCAL unrotated mm space
        "b": { "x": 90, "y": 30 },
        "angle": 90,                  // target fold/dihedral angle in degrees (mountain +, valley −)
        "name": "main fold"
      }
    ]
  }
}
```

Notes:
- `assembly` is the **single source of truth**. The in-memory `S` mirrors it as `S.assembly` plus a
  derived `Map` keyed by `"shapeId:edge"` → seam, rebuilt by `validateSeams()`.
- A seam member identifies an **edge**, never a hole or a stitch. Stitching stays independent — a seam
  edge may or may not also be a stitched edge (commonly is, for `type:"stitch"`).
- `name` doubles as the tag from the survey discussion. Two seams may not share a name within a
  document (the authoring UI enforces uniqueness; on load, duplicates are suffixed).

---

## 5. Worked example — 3-panel card holder (N-way spine seam)

A Citizen-Twill-style holder: a **back** panel and two overlapping **card pockets**, all sewn down one
shared spine. Three rect edges stack at one seam — the case that motivates the tag-group model.

```jsonc
"shapes": [
  { "id": 1, "type": "rect", "x":  0, "y": 0, "w": 100, "h": 70, "thickness": 1.6 }, // back
  { "id": 2, "type": "rect", "x": 120, "y": 0, "w": 100, "h": 45, "thickness": 1.2 }, // front pocket
  { "id": 3, "type": "rect", "x": 240, "y": 0, "w": 100, "h": 45, "thickness": 1.2 }  // inner pocket
],
"assembly": {
  "version": 1,
  "seams": [
    {
      "id": 1, "name": "spine", "type": "stitch", "order": 1, "allowance": 4,
      "members": [
        { "shape": 1, "edge": 3 },   // back: left edge
        { "shape": 2, "edge": 3 },   // front pocket: left edge
        { "shape": 3, "edge": 3 }    // inner pocket: left edge
      ]
    },
    {
      "id": 2, "name": "pocket-mouth-trim", "type": "stitch", "order": 2,
      "members": [
        { "shape": 2, "edge": 0 },   // top edge, decorative top-stitch (single-member = edge-finish, not a join)
      ]
    }
  ],
  "folds": []
}
```

The 3D app reads seam `1`, sees three edges sharing the `"spine"` group, aligns them by endpoints,
checks all three are ~70/45 mm compatible where they overlap, and stacks/sews them along one line —
no pairwise bookkeeping. (A single-member seam like `2` is just a tagged edge finish; valid, but not a
join — the consumer treats it as decoration, not a fold target.)

---

## 6. Back-compat & migration

- **Load:** if `data.assembly` is absent (every v1–14 file), default
  `S.assembly = { version: 1, seams: [], folds: [] }`. No migration of old geometry needed — old files
  simply have no assembly data.
- **Save:** always emit `assembly` (empty is fine) and bump `version` to `15`.
- **Per-shape `thickness`:** optional; `normShape()` leaves it `undefined` when absent (consumer falls
  back to its global thickness). No coercion needed beyond ignoring non-numbers.
- **Round-trip test:** extend the `saveload` / `artboards` smoke feature with an assert that a doc with
  one multi-member seam + one fold + a per-shape thickness survives `buildSaveData()` →
  `applyLoadedData()` byte-for-byte (and that a v14 file loads with an empty `assembly`). Bump the
  schema-version assert. (Per CLAUDE.md: bump schema version + add a round-trip assert when the schema
  changes.)

---

## 7. Validation rules (`validateSeams()`)

Run on load and after topology changes (anchor add/delete, shape delete, path open↔close, shape
type-convert):

1. Drop any member whose `shape` no longer exists or is `edge >= shapeEdgeCount(sh)` (or a circle).
2. Drop seams left with **0 members**; keep 1-member seams (edge finishes) but mark them non-joining.
3. Rebuild the derived `"shapeId:edge" → seam` map.
4. If anything was dropped, `flash()` a themed warning with the count.
5. **Soft checks surfaced to the 3D app, not blocking (the "preview what could go wrong" goal):**
   per join, compare member edge arc-lengths — flag a **length mismatch** beyond a tolerance; flag a
   member whose endpoints don't meet any sibling's (an **orphan** in the group). These are *warnings*,
   computed from geometry, never stored.

---

## 8. What the 3D app does with it (hand-off to #10)

Brief, so the schema is justified end-to-end:
- **Fold/preview:** treat the seam graph as join constraints; pin paired edges together and rotate
  pieces about shared seams/fold lines into the assembled shape (constraint solve or, initially,
  parametric templates for known goods). v15 gives it the join graph + fold lines + thickness it needs.
- **Problem detection:** render length-mismatch / orphan-edge warnings from §7 directly on the 3D
  preview — the app becomes "a preview of what could be the problem" even before a full solver exists.
- **Instructions (later):** an ordered traversal of `seams` by `order` (then graph order) yields the
  Lego-manual steps.

The 3D app **never writes** `.lpd` — it consumes `assembly` read-only. **Full consumption design (#10)
lives in the 3D repo: `Leather Studio 3D/MD files/SEAM-CONSUMPTION.md`** — phased fold (2a seam-aware
flat view → 2b rigid hinge-tree → 2c constrained/template close), Tier-1/Tier-2 problem detection, and
the instructions tie-in.

---

## 9. Open / deferred items

- Stable path-anchor `aid`s (the Q1 robustness upgrade) — only if index fragility bites.
- Circle-as-seam-member (a circular piece joined to a rolled edge) — deferred; needs an edge concept
  for circles.
- The fold *solver* and instructions *generator* — separate phases; this doc is data only.
- Bidirectional parametric sync — out of scope until parametric templates exist.

---

## 10. Implementation checklist (for when we build it — not this session)

1. `buildSaveData()` → `version: 15`, emit `S.assembly`; `applyLoadedData()` → default-empty
   `S.assembly`, call `validateSeams()`.
2. `S.assembly` state + derived edge→seam map; `validateSeams()` wired into the mutation paths in §7.
3. Optional `sh.thickness` read/write; leave `normShape()` permissive.
4. Seam-tagging UI (#9) — **designed in §11**: a dedicated Seam tool (key `S`) for multi-edge picking
   across shapes + an Assembly panel (seam list + per-seam editor). Reuses the edge hit-test, the
   `.p-sec` panel idiom, `kbActivate`, and `pushHist` (so undo covers seams).
5. Smoke: round-trip assert + a `seams` feature (validate prunes stale refs; N-way group intact;
   length-mismatch warning fires).
6. Mirror the edge-ref contract note into the 3D app's CONTEXT.md so both stay in lockstep.

---

## 11. Seam-tagging UI — Pattern Designer authoring (design, #9)

How the user *creates* the §4 data. Design only; reuses existing primitives wherever possible.

### 11.1 The core gap

Today edge selection is **single-edge, single-shape**: clicking an edge of the selected shape sets
`S.selEdge = {id, edge}` and the Stitching panel shows "Stitch edge N of M" (`#edge-stitch-row` →
`toggleEdgeStitch`). A seam needs **2+ edges, often across different shapes**, grouped under one name.
So authoring needs (a) **multi-edge selection across shapes** and (b) a **panel to name/type/manage**
the groups. Both are additive — no existing interaction changes.

### 11.2 Interaction model — a dedicated **Seam tool** (key `S`)

Slots into the existing tool model (Select V · Rotate R · Artboard A · Rect B · Pen P · Text T; `S`
and `M` are free). Rationale: a mode keeps additive edge-picking from overloading Select's click, and
matches how Rotate/Artboard already work. Toolbar button + `case 's'` in the key handler.

In the Seam tool:
- **Every shape's edges become hoverable/clickable** (not just the selected shape's) — reuse the
  existing edge hit-test + `hoverEdge` highlight + `edgePathD`. Circles (0 edges) and hidden/locked
  shapes are inert.
- **Click an edge → toggle it into the active selection** `S.seamSel` (a *list* of `{id, edge}`,
  the multi-edge analogue of `S.selEdge`). Click again to remove. Picked edges draw in the **pending
  colour** (amber) with a small index badge.
- **Enter / "Create seam"** groups the pending edges into a new `assembly.seams[]` entry with an
  auto-suggested editable name ("seam 1", or smart "spine"/"gusset" later) and `type:"stitch"` default.
- **Esc** clears the pending selection; **click a member of an existing seam** selects that seam for
  editing (and loads its members as the active selection).
- Clicking an edge already in another seam offers to move/add it (an edge may belong to **one** seam at
  a time in v15 — keep it simple; multi-seam edges deferred).

### 11.3 The **Assembly panel** (new collapsible props section)

A new `.p-sec` "Assembly" (LPD-style `.p-hd`/`.p-sec-body`, collapsible, a11y `role=button` header to
match the v0.7.24 pass), shown when the Seam tool is active or any seam exists. Two parts:

**A. Seam list** — one row per seam: a **colour chip** (each seam gets a stable colour), the editable
**name**, a **type badge** (✄ stitch / ⟋ fold / ● glue), and a **member count**. Rows are focusable
`role=button` controls; hovering/selecting a row **pulses its member edges** on the canvas. Trailing
**⊘ delete**. A **"＋ New seam from selection"** button (enabled when `S.seamSel` has ≥1 edge).

**B. Selected-seam editor** (shown when a seam row is active):
- **Name** text field (unique within the doc; dupes auto-suffixed on commit).
- **Type** dropdown — `stitch | fold | glue`.
- **Order** number (assembly step; blank = unordered) and **Allowance** mm (defaults to `defMargin`).
- **Members** list — each `Shape «name» · edge N`, with a **remove** (✕) and a **locate** (◎ → select
  that shape + flash the edge). An **"＋ Add edges"** affordance re-enters pick mode appending to this
  seam.
- A live **warning strip** when the editor can already tell something's off (see 11.5).

```
ASSEMBLY ─────────────────────────── ▾
 ● spine        ✄ stitch      3 edges  ⊘
 ● pocket-trim  ✄ stitch      1 edge   ⊘
 ＋ New seam from selection

 ── spine ───────────────────────────
 Name      [ spine            ]
 Type      [ Stitch        ▾ ]
 Order [ 1 ]   Allowance [ 4 ] mm
 Members
   ◎  Back · edge 4        ✕
   ◎  Front pocket · edge 4 ✕
   ◎  Inner pocket · edge 4 ✕
   ＋ Add edges
 ⚠ Front pocket edge is 45mm vs Back 70mm — check overlap
```

### 11.4 Visual language on the canvas

- Each seam = a **stable colour** (hashed from its id; distinct from the cyan edge-hover and the
  stitch teal). Member edges are stroked in that colour with the **seam name** at the edge midpoint
  (screen-only, hidden in print/export — like the existing on-shape labels).
- N-way seams read naturally: three edges in the same colour + same label = one spine.
- **Pending** picks (pre-create) are amber with index badges. **Active** seam (being edited) is
  emphasised; others dim slightly.
- Print/SVG/PNG export **never** show seam overlays (assembly is screen-only metadata).

### 11.5 In-editor problem hints (cheap subset of §7)

The editor has the geometry, so it can surface the *cheap* checks immediately (the full fold/twist
analysis stays 3D-side): **length mismatch** (member edge arc-lengths differ beyond tol) and
**orphan** (a member whose endpoints meet no sibling's). Shown as a non-blocking ⚠ strip in the seam
editor + a dashed-red tint on the offending edge. This is the editor's slice of "preview what could go
wrong," available without the 3D app open.

### 11.6 Folds authoring (sketch — sequence after seams)

A fold is interior line geometry, not an edge, so it needs a small **fold sub-mode** of the Seam tool
(or a toggle): click two points (grid/anchor-snappable) to drop a crease line into `assembly.folds[]`,
then set its **angle** (mountain +/valley −) in the seam editor. Lower priority than edge-seams;
designed here only enough to reserve the interaction. Creases render as dashed lines in the seam
colour, screen-only.

### 11.7 Select-tool touchpoint

So users discover seams without switching tools: when a single edge is selected in **Select** and it
belongs to a seam, the existing edge row gains a one-line "Part of seam «spine» ▸" link that activates
the Seam tool + that seam. Minimal; keeps Select uncluttered.

### 11.8 State + reuse summary (for when we build it)

- New transient state: `S.seamSel` (list of `{id,edge}` being picked), `S.activeSeam` (id under edit).
  `S.assembly` is the persisted model (§4); seam create/edit/delete go through `pushHist()` like any
  mutation, so **undo/redo covers seams** for free.
- Reuse: edge hit-test, `hoverEdge`, `edgePathD`, the `.p-sec`/`.p-hd`/`.p-pair`/`.p-field` panel
  idiom, `kbActivate` for the focusable rows, `flash()` for create/prune feedback, themed
  `confirmModal` for destructive deletes.
- Keyboard/a11y: tool key `S`; Enter = create, Esc = clear; panel rows + chips are real `role=button`
  controls with the global focus ring (consistent with the recent a11y passes in both apps).
- Edge cases: circles can't be picked (0 edges); hidden/locked shapes inert; a 1-member seam is a
  valid **edge finish** (badge distinguishes it from a join); deleting a shape prunes its members via
  `validateSeams()` with a flash.

_This is UI design only — no code this pass. The 3D consumption design (#10) is done:
`Leather Studio 3D/MD files/SEAM-CONSUMPTION.md`._

---

_This document is the contract between the two apps. Keep it in sync if the edge indexing or the
`assembly` shape ever changes; the 3D app's loader depends on it._
