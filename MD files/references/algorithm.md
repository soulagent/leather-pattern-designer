# Stitch-edge algorithm — detailed walkthrough

Stage-by-stage detail behind `SKILL.md`, with the reference code from
`index.html`. Three generators share one principle (even distribution along the
inset edge); they differ only in how much geometry they have to compute.

## Contents
- [Shared data](#shared-data)
- [Rectangles — `stitchRect`](#rectangles)
- [Circles — `stitchCircle`](#circles)
- [General paths — `stitchPath`](#general-paths)
- [Rounded rects — `roundedRectPathPts`](#rounded-rects)
- [Rendering — `stitchHole`](#rendering)

## Shared data

A hole is `{ x, y, forced, hl, a }` (see SKILL.md). Both `m` (margin) and `sp`
(spacing) come from the shape, falling back to document defaults:

```js
const m = sh.stitchMargin ?? defMargin, sp = sh.stitchSpacing ?? defSpacing;
```

`edgeStitched(sh, e)` gates whether edge `e` is stitched at all (per-edge toggles;
undefined = all edges on). Runs only ever include stitched edges.

## Rectangles

Axis-aligned rectangles need no sampling — the inset is just the rect shrunk by
`m`, and each edge is a straight segment. The key move is **even distribution per
edge** so parallel edges align:

```js
function stitchRect(sh) {
  const m = sh.stitchMargin ?? defMargin, sp = sh.stitchSpacing ?? defSpacing;
  const x1 = sh.x+m, y1 = sh.y+m, w = sh.w-2*m, h = sh.h-2*m;
  if (w <= 0 || h <= 0) return null;                 // margin swallowed the shape
  const x2 = x1+w, y2 = y1+h;
  const C = [{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}]; // inset corners, CW
  const pts = []; let path = '';
  for (let e = 0; e < 4; e++) {
    if (!edgeStitched(sh, e)) continue;
    const a = C[e], b = C[(e+1)%4];
    const dx = b.x-a.x, dy = b.y-a.y, len = Math.hypot(dx,dy);
    const ang = Math.atan2(dy,dx), ux = dx/len, uy = dy/len;
    const N = Math.max(1, Math.round(len/sp)), step = len/N;  // EVEN: N equal gaps
    for (let i = 0; i < N; i++) {                    // hole at each corner + interior
      const d = i*step;
      pts.push({ x:a.x+ux*d, y:a.y+uy*d, forced:i===0, hl:i===0, a:ang });
    }
    // the far corner is the NEXT edge's start hole; place it here only if that edge is off
    if (!edgeStitched(sh, (e+1)%4)) pts.push({ x:b.x, y:b.y, forced:true, hl:true, a:ang });
    path += `M${a.x},${a.y} L${b.x},${b.y} `;
  }
  return pts.length ? { pts, path: path.trim() } : null;
}
```

Why it works: parallel edges (top/bottom, left/right) have identical `len`, so
they get identical `N` and `step` → their hole rows register exactly. Each edge
owns its **start** corner; the shared corner with the next edge is placed once.

## Circles

No corners, so nothing is forced; just space holes evenly around the inset
circumference and orient each tangentially:

```js
function stitchCircle(sh) {
  const m = sh.stitchMargin ?? defMargin, sp = sh.stitchSpacing ?? defSpacing;
  const r = sh.r - m; if (r <= 0) return null;
  const count = Math.max(8, Math.round(2*Math.PI*r / sp));
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i/count)*2*Math.PI - Math.PI/2;
    pts.push({ x:sh.cx+r*Math.cos(a), y:sh.cy+r*Math.sin(a), forced:false, hl:false, a:a+Math.PI/2 });
  }
  return { pts, /* ...arc path... */ };
}
```

## General paths

`stitchPath(sh)` handles arbitrary closed/open bezier outlines (and rounded
rects, via `roundedRectPathPts`). Constants:

```js
const SEG_STEPS = 40;     // bezier samples per segment; MUST equal the sampler's step count
const HARSH_ANGLE = 0.6;  // radians (~34°): tangent turn above which a corner is "harsh"
```

### 1–3. Sample, wind, offset inward

`samplePath` walks each segment with `sampleSeg(p0,p1,steps=40)` (cubic bezier
eval), dropping the duplicated joint sample. Signed area gives the winding sign;
each sample is offset by `m` along the normal of its prev→next chord:

```js
const sign = area < 0 ? -1 : 1;                  // CW vs CCW → inward direction
for (let i = 0; i < samples.length; i++) {
  const prev = samples[(i-1+n)%n], next = samples[(i+1)%n];
  const dx = next.x-prev.x, dy = next.y-prev.y, L = Math.hypot(dx,dy);
  if (L < 0.001) { off.push({...samples[i]}); continue; }   // degenerate span
  off.push({ x: samples[i].x - dy/L*sign*m, y: samples[i].y + dx/L*sign*m });
}
```

### 4. Miter sharp corners

The chord-normal offset only insets a sharp corner along its diagonal bisector
(by `m`), not by `m` from each edge. Replace harsh-anchor offset points with a
true miter vertex, capped so acute corners bevel instead of spiking:

```js
// miter vertex = p + m*(n1+n2)/(1 + n1·n2), n1/n2 = inward edge normals
const kk = 1 + (n1.x*n2.x + n1.y*n2.y);
if (kk < 0.1) { off[idx] = {x:p.x+n1.x*m, y:p.y+n1.y*m}; return; } // near-reflex guard
let vx = m*(n1.x+n2.x)/kk, vy = m*(n1.y+n2.y)/kk;
const vlen = Math.hypot(vx,vy), cap = m*2;        // 90° → 1.41m; cap bevels < ~60°
if (vlen > cap) { vx = vx/vlen*cap; vy = vy/vlen*cap; }
off[idx] = { x:p.x+vx, y:p.y+vy };
```

### 5. Geometric harsh detection

Never trust a `corner` flag — measure the turn. Neighbour lookups skip coincident
duplicate samples (closed-path seam, and any zero-length span):

```js
const harsh = k => {
  if (!sh.closed && (k<=0 || k>=n-1)) return false;       // open ends aren't interior corners
  const idx = k*SEG_STEPS, P = samples[sBefore(idx)], Q = samples[idx], R = samples[sAfter(idx)];
  let d = Math.atan2(R.y-Q.y, R.x-Q.x) - Math.atan2(Q.y-P.y, Q.x-P.x);
  while (d > Math.PI) d -= 2*Math.PI; while (d < -Math.PI) d += 2*Math.PI;
  return Math.abs(d) > HARSH_ANGLE;
};
```

### 6–7. Group into runs, trim behind-corner samples

Consecutive stitched edges form a run; an unstitched edge or harsh corner starts a
fresh run. Smooth anchors do **not** break a run. Then, because the mitered corner
is inset past its neighbours, clip the offset samples that fall *behind* the corner
along the edge direction (a dot-product test), so the inset edge runs cleanly
corner-to-corner instead of doubling back.

### 8. Even-distribute each run

Identical principle to `stitchRect`, but along the run's arc length:

```js
const N = Math.max(1, Math.round(total/sp)), step = total/N;
const lastK = run.endsRun ? N : N-1;   // skip the shared end corner unless the run terminates
for (let k = 0; k <= lastK; k++) {
  const t = Math.min(k*step, total);
  // ...walk the cumulative-length table to find (x,y) at distance t...
  const isStart = k===0, isEnd = k===N;
  const a = isStart ? angOut(sIdx) : isEnd ? angIn(eIdx) : angAt(idx[seg]); // edge tangent
  pts.push({ x, y, forced: isStart||isEnd, hl: (isStart&&run.startHarsh)||(isEnd&&run.endHarsh), a });
}
```

### 9. Orientation helpers

```js
const angAt  = i => Math.atan2(samples[min(i+1)].y - samples[max(i-1)].y,
                               samples[min(i+1)].x - samples[max(i-1)].x); // central, mid-run
const angOut = i => angle from samples[i] → samples[i+1];   // run start (outgoing edge)
const angIn  = i => angle from samples[i-1] → samples[i];   // run end (incoming edge)
```

Orientation is read from the **original samples**, not the inward-offset polyline,
so a straight edge keeps its exact tangent and the miter-displaced corner vertex
doesn't skew nearby slit angles.

### 10. Minimum-gap cull

```js
const minGap = sp*0.5;
// walk holes in path order; if a hole is within minGap of the kept neighbour:
//   forced beats regular (pop ALL trailing regulars within minGap, then keep the forced one)
//   two regulars → drop the newcomer
//   two forced → keep both (distinct corners)
// closed paths: also test last-vs-first wrap
```

## Rounded rects

A rect with any corner radius is stitched as a path built by `roundedRectPathPts`.
**The critical rule:** a zero-radius corner emits a **single sharp anchor**, never
two coincident ones (which would create a zero-length segment → ~40 identical
samples → degenerate corner math → piled holes).

```js
const addCorner = (r, eInX,eInY, vX,vY, eOutX,eOutY) => {
  if (r <= 0) { pts.push({x:vX,y:vY, cp1x:vX,cp1y:vY, cp2x:vX,cp2y:vY, corner:true}); return; }
  pts.push({x:eInX, y:eInY,  cp1x:eInX, cp1y:eInY, cp2x:eInX+(vX-eInX)*k, cp2y:eInY+(vY-eInY)*k, corner:false});
  pts.push({x:eOutX,y:eOutY, cp1x:eOutX+(vX-eOutX)*k, cp1y:eOutY+(vY-eOutY)*k, cp2x:eOutX, cp2y:eOutY, corner:false});
};
// k = 0.5522847498 (cubic-bezier quarter-circle factor)
```

So a rounded corner contributes two smooth arc anchors; a sharp corner contributes
one `corner:true` anchor. The point count is therefore variable (4–8 anchors for a
rect), and the geometric harsh test in `stitchPath` then treats the sharp corners
exactly like the rect tool does.

## Rendering

`stitchHole(p)` draws one mark, rotated by `p.a`. Physical sizes are in real-world
units so a 1:1 print matches the iron:

```js
const deg = (p.a||0)*180/Math.PI;
if (style === 'diamond') rect 0.6 half-diag, rotate(deg+45);
else if (style === 'french') rect L=0.6 W=0.175 (≈1.2×0.35 mm), rotate(deg-30);  // Vergez Blanchard
else circle r=0.45;                                                              // round
// hl holes are tinted and wrapped with an explanatory <title> tooltip
```
