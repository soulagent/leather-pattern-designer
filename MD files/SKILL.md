---
name: stitch-edge-logic
description: >-
  How to generate saddle-stitch hole positions along the inset edge of a 2D
  outline (rectangles, circles, and bezier paths) in code — the algorithm behind
  the Leather Pattern Designer's stitch render. Covers inward margin offset, EVEN
  hole distribution, geometric harsh-corner detection, miter insets with caps,
  per-edge runs, hole orientation, and hole styles (round / french / diamond).
  Use this whenever you implement, modify, debug, or review stitch-hole (or
  edge-perforation) placement, "saddle stitch" / "pricking iron" simulation, or
  corner treatment for a stitched outline — and ESPECIALLY for symptoms like
  stitch holes bunching or doubling at corners, uneven hole spacing, parallel
  edges whose hole rows don't line up, holes not landing exactly on corners, or
  slit / chisel marks pointing the wrong way. Reach for it even when the user
  only says something vague like "the stitching looks wrong near the corner"
  without naming the algorithm. Do NOT use it for: physically hand-sewing a
  saddle stitch (thread-and-needle technique), CSS borders or dashed strokes,
  evenly spacing UI elements (flexbox/grid), or regular perforation grids across
  sheet material — it is specifically about computing hole geometry along a 2D
  shape's inset edge.
---

# Stitch-edge logic (saddle-stitch hole generation)

This skill captures a battle-tested algorithm for placing stitch holes along the
**inset edge** of a 2D shape, the way a leatherworker marks saddle-stitch holes
with a pricking iron. It is the distilled result of many iterations fixing corner
bunching, uneven spacing, and misaligned hole rows — so lean on the **hard-won
rules** below rather than re-deriving them.

The reference implementation is `index.html` in this project (`stitchRect`,
`stitchPath`, `stitchCircle`, `stitchHole`, `roundedRectPathPts`). For a
stage-by-stage walkthrough with code, read **`references/algorithm.md`**.

## The problem

Given a closed outline and two parameters — **margin `m`** (how far in from the
edge the stitch line sits) and **spacing `sp`** (the hole interval) — produce a
list of hole positions on the inset line such that:

- holes are **evenly spaced** along each edge (no remainder dumped at one end);
- **every sharp corner gets exactly one hole**, sitting on the inset corner;
- **parallel edges produce hole rows that line up** (a leather panel folds/joins
  cleanly only if the two sides' holes register);
- each hole carries a **slit orientation** matching the edge it sits on;
- no two holes **pile up** on top of each other at corners.

## Output shape

Every generator returns `{ pts, path }`:

- `pts`: array of holes, each `{ x, y, forced, hl, a }`
  - `x, y` — hole centre, in the shape's units (mm here)
  - `forced` — placed because it's a corner (not part of the even march)
  - `hl` — highlight it (this build tints forced corner holes teal + adds a tooltip)
  - `a` — **slit angle in radians**, the edge tangent at the hole (round holes ignore it)
- `path`: the dashed inset guide line (SVG `d`), for showing the stitch line

## Pipeline (closed bezier path — the general case)

`stitchPath(sh)` is the heart of it. Stages, in order:

1. **Sample** the path to a dense polyline — `SEG_STEPS` (40) points per bezier
   segment. The 40 **must** match the sampler's step count, because each anchor
   `k` is later found at polyline index `k * SEG_STEPS`.
2. **Winding** — signed area decides clockwise vs counter-clockwise, which sets
   the sign of the inward normal so the offset goes *into* the shape.
3. **Inward offset** — push every sample in by `m` along the local normal
   (from the averaged prev→next chord). Zero-length spans copy the point.
4. **Miter the sharp corners** — at each harsh anchor, replace the averaged
   offset point with a true miter vertex `p + m·(n1+n2)/(1+n1·n2)` so the corner
   insets by `m` from *both* edges. **Cap the miter at `2m`** so an acute corner
   bevels instead of spiking toward the centroid; guard the near-reflex case.
5. **Detect harsh corners geometrically** — a corner is "harsh" when the stitch
   tangent turns more than `HARSH_ANGLE` (~0.6 rad / 34°) across the anchor. Use
   the *geometry*, never a stored `corner` flag (see rules). Open-path endpoints
   are run boundaries, not interior corners.
6. **Group into runs** — consecutive stitched edges form a run; a run breaks at
   an unstitched edge or a harsh corner. **Smooth anchors flow through** (curves
   don't break the march).
7. **Trim behind-corner samples** — the mitered corner is inset further than its
   neighbours, so the raw offset polyline backtracks there. Clip the samples that
   fall *behind* the corner along the edge direction, or the even-distribution
   bunches a hole one short gap from each corner.
8. **Even-distribute each run** — `N = round(arcLength / sp)`, then place `N`
   (or `N+1`) holes at equal `arcLength/N` steps so both run ends land exactly on
   the endpoints. Place a run's far-end hole **only if the run truly terminates**,
   so a shared corner between two stitched edges is placed **once**.
9. **Orient to an EDGE tangent** — outgoing edge at a run start (`angOut`),
   incoming edge at a run end (`angIn`), local tangent mid-run (`angAt`). Corner
   holes follow the run they sit in, **not** the corner bisector.
10. **Minimum-gap cull** — drop any hole closer than `sp/2` to its kept neighbour.
    A **forced corner hole wins** over a regular one; two genuine forced corners
    are both kept; for closed paths also check the last-vs-first wrap.

Rectangles and circles get **analytic fast paths** (`stitchRect`, `stitchCircle`)
that implement the same even-distribution principle without sampling — see
`references/algorithm.md`. A rect with **any** corner radius is routed through
`stitchPath` via `roundedRectPathPts`.

## Hard-won rules (do not regress these)

Each of these encodes a specific failure that was painful to fix. Keep the
*reason* in mind; the symptom returns the moment the reason is forgotten.

- **Distribute evenly, never march-with-remainder.** Marching at the raw `sp` and
  dumping the leftover at the far corner offsets parallel edges' rows relative to
  each other (one side measured from the top corner, the other from the bottom).
  `N = round(len/sp)` equal steps makes parallel edges — which share a length —
  produce identical, aligned rows.

- **Detect harsh corners from geometry, not a flag.** A point can be flagged
  "smooth" yet be geometrically a sharp 90° turn (e.g. an anchor with coincident
  handles). Trusting a `corner` flag lets those bypass corner handling and bunch.
  Measure the tangent turn against `HARSH_ANGLE`.

- **Cap the miter at `2m`.** An acute corner's true miter length is `m/sin(θ/2)`,
  which blows up as θ shrinks and flings the corner point toward the centroid.
  Capping at `2m` leaves right angles exact (`m·√2 ≈ 1.41m`) and only bevels
  corners sharper than ~60°.

- **Trim the offset polyline behind each mitered corner.** Otherwise the inset
  line doubles back at the corner, corrupting the arc-length distribution and
  bunching holes ~one gap from the corner.

- **Orient corner holes to an edge, not the bisector.** A bisector ("picture
  frame") slant makes french/diamond slits cross the run of stitches. Edge-aligned
  slits read as one continuous run through the corner.

- **Let smooth anchors flow through.** Forcing a hole + resetting the march at
  every bezier anchor drops dots on the "tip" of a smooth curve (the anchor point,
  which sits *outside* the rounded curve). Only harsh corners and run boundaries
  reset the march.

- **A zero-radius corner must be ONE anchor, not two coincident ones.** When you
  build a path to approximate a rounded rect, emit a single `corner:true` anchor
  for any zero-radius corner. Two coincident anchors create a zero-length segment
  that samples into ~40 identical points and makes every corner computation
  degenerate (`atan2(0,0)`) — the classic "holes piled at the corner" bug. See
  `roundedRectPathPts` in `references/algorithm.md`.

- **Keep `SEG_STEPS` equal to the sampler's step count.** Anchors are located in
  the sampled polyline by `anchorIndex * SEG_STEPS`. If they drift apart, corner
  detection and miters land on the wrong samples.

## Key constants (tune to taste, but know what they do)

| Constant | Value here | Meaning |
|---|---|---|
| `m` (margin) | per-shape, default ~3 mm | inset of the stitch line from the edge |
| `sp` (spacing) | per-shape, e.g. 2.7–3.85 mm | hole interval (pricking-iron pitch) |
| `HARSH_ANGLE` | 0.6 rad (~34°) | tangent turn above which a corner is "harsh" |
| `SEG_STEPS` | 40 | bezier samples per segment; = sampler steps |
| miter cap | `2·m` | max corner inset before bevelling |
| min gap | `sp/2` | cull holes closer than this |

## Hole styles (rendering)

`stitchHole(p)` draws one mark per `p`, rotated by `p.a` (the edge tangent):

- **round** — a small filled circle (orientation-invariant).
- **french** — a thin rounded slit (~`1.2 × 0.35 mm`, slanted ~30°); matches a
  Vergez Blanchard pricking iron and prints true at 1:1.
- **diamond** — a rotated square (slit at +45° to the edge).

Forced corner holes (`hl`) are tinted and carry a tooltip explaining the corner
rule. Always size physical marks in real-world units so a 1:1 print matches the
actual iron.

## When you change the schema or constants

Add a round-trip/regression check. In this project the smoke harness has a
`stitch-radii` feature that reproduces the coincident-anchor bug (a square with
one rounded corner) and asserts no piled holes and exactly the right number of
forced corner holes — mirror that pattern for any new corner case.
