# Leather Pattern Designer — Style Guide

_Human-facing design reference, derived from the live `index.html` (v0.7.18). The agent-facing
version (design tokens + rules for code changes) lives in `.claude/skills/ui-language/SKILL.md`.
This document also records the **WCAG contrast audit** (§8) — the source of truth for which colours
are accessible and which need fixing._

---

## 1. Design principles

1. **Dark-first; light is an additive override.** The dark theme is the default and the source of
   truth. Light mode (`body.light`) only recolours — it never changes layout. Never fork structure
   per theme.
2. **One shared red accent in both themes.** Selection, active tool, focus ring, primary buttons,
   checkmarks and checkboxes all use the same red. It is the single "active / brand" signal.
3. **Quiet chrome, loud accent.** Chrome is low-contrast near-navy greys; the only saturated colour
   is the accent (and the per-shape palette on the canvas). Don't add new accent colours for states.
4. **In-app themed dialogs, never native.** `confirm()` / `alert()` / `prompt()` are banned — they
   break the theme and the french-stitch identity. Use `confirmModal` / `alertModal`.
5. **Dense, professional, Figma/Illustrator-like.** Small type, tight padding, grouped two-column
   property rows. This is a CAD tool, not a marketing page.
6. **Millimetres are truth on the canvas.** Geometry is mm; print/export are 1:1 physical scale. UI
   pixels and world mm never get conflated.

---

## 2. Colour palette

> **Implemented as CSS custom properties** (v0.7.19). The dark theme defines them in `:root`;
> `body.light` re-points the same tokens. **Change a colour here, at the token, not at the call
> site.** Text tiers: `--text` (primary), `--text-2` (secondary), `--text-muted`, `--text-faint`,
> `--text-heading`. Surfaces: `--bg --canvas --panel --raised --dialog --hover --border
> --border-soft`. Accent: `--accent --accent-bright --accent-hover --accent-soft`. Semantic/canvas:
> `--success --drop --shape --stitch`. (Surface/border literals in non-text rules aren't all migrated
> yet — see the DEVLOG backlog.)

### Dark (default)

| Token / role | Hex |
|---|---|
| App background / canvas void | `#1a1a2e` (body), `#0d0d1f` (canvas, deepest strips) |
| Chrome panel (menubar, toolbar, props, status) | `#12122a` |
| Raised surface (dropdowns, inputs, settings modal) | `#1e1e38` |
| Dialog background (confirm) | `#16162c` |
| Hover surface | `#2a2a4a` |
| Borders / separators | `#2a2a4a` · subtle `#242444` / `#1e1e38` |
| Primary text | `#eee` |
| Secondary text / labels | `#888` |
| Muted text | `#777` → `#555` (see contrast audit — too low) |
| Group heading | `#6c6c92` |
| **Accent — base** | `#c0392b` |
| **Accent — bright** (border/hover/focus) | `#e74c3c` |
| Accent — soft (unsaved dot) | `#e0506a` |
| Success (status "Saved ✓") | `#4a8` |
| Drag-drop indicator | `#4dd2ff` |

### Light (`body.light` override — accent unchanged)

| Token / role | Hex |
|---|---|
| App background | `#eef0f4` (body), `#fbfbfd` (canvas) |
| Chrome panel | `#e4e6ee` |
| Raised surface / inputs | `#fff` |
| Hover surface | `#d4d7e4` / `#e6e8f2` |
| Borders | `#cdd0dc` / `#dde0ea` |
| Primary text | `#23232e` |
| Secondary text | `#888` (see audit — too low on light chrome) |
| **Accent** | `#c0392b` / `#e74c3c` (shared with dark) |

### Canvas / SVG semantic colours (both themes)

| Element | Hex |
|---|---|
| Shape stroke (default) | `#3a7bd5` (blue); fill `rgba(255,255,255,.04)` |
| Shape selected | stroke `#e74c3c`; fill `rgba(231,76,60,.07)` |
| Stitch line + holes | `#e67e22` (orange) |
| Forced-corner hole highlight | `#00e0c6` (cyan) |
| Pen first-anchor / close cue | `#27ae60` (green) |
| Per-shape palette (`SHAPE_COLORS`) | `#3a7bd5` `#e74c3c` `#27ae60` `#e67e22` `#9b59b6` `#16a085` `#f1c40f` `#e84393` `#d35400` `#95a5a6` |

> **Print is always black-on-white and ignores the theme.** On-screen hollow/outline labels map back
> to solid dark fill for print legibility.

---

## 3. Typography

- **Family:** `system-ui, sans-serif` everywhere (UI and on-canvas labels).
- **Scale:**

| Size | Use |
|---|---|
| 9px | property subcategory headings (`.p-grp`), micro group labels — UPPERCASE, letter-spacing ~.07em |
| 10px | section headings (`.p-hd`), notes, status bar |
| 11px | field labels, layer names, keyboard hints |
| 12px | inputs, menu actions, buttons |
| 13px | menu items, dialog body, dim summary |
| 15px | dialog / modal `h3` |

- Headings are UPPERCASE with letter-spacing; body text is sentence case.
- **Caution:** several of these (9–11px greys) are the contrast offenders — see §8.

---

## 4. Spacing, radius, layout

- **Padding:** panel `0 11px`; rows `margin-bottom:5px`; group heading `margin:17px 0 8px`.
- **Radius:** 4px inputs/buttons · 6px tool buttons & tabs · 8–10px modals · 3px small toggles.
- **Layout shell (top→bottom):**
  `menubar (30px) → tabbar (30px) → main[ toolbar 46px | canvas flex | resize 6px | props 210px ] → status (22px)`.
- Toolbar: icon-only 34×34 `<button>`s, vertical, `.t-sep` dividers, CSS `data-tip` tooltip.
- Props panel: collapsible `.p-sec` sections; width persisted to `localStorage['lpat-props-w']`.

---

## 5. Components

### Buttons & toggles
- **Default:** transparent / `#1e1e38` surface, `#aaa`–`#ccc` text, subtle border.
- **Hover:** `#2a2a4a` surface, white text.
- **Active / on:** `#c0392b` fill, `#e74c3c` border, white text. _Same recipe everywhere_
  (`.t-btn.active`, `.p-btn.on`, align cells, primary dialog button).

### Property rows (the canonical form layout)
- `.p-grp` — UPPERCASE subcategory heading with a bottom border (Position, Size, Rotation, …).
- `.p-pair` — 2-column grid for paired fields (X|Y, W|H).
- `.p-field` — one labelled field (`.p-fl` = 1-char label; `.p-lbl` = 52px label).
- `.p-inp` / `.p-sel` — **focus = accent border** (`#e74c3c`, outline removed).
- `.p-ck-row` — checkbox row, checkbox `accent-color:#e74c3c`.
- Pattern: heading → paired rows → checkboxes → optional `.p-note` helper text.

### Menus
- Menubar `.m-item` → `.m-drop`. Action `.m-act` = text left, keyboard hint (`.kb`) + checkmark
  (`.m-chk`, accent) right-aligned. `.m-sep` dividers, `.m-grp-lbl` group labels, `.m-nest` submenus.
- ⚠️ Currently **hover-only** (no keyboard open) — see §9.

### Layers rows
- `.lay-row`: grip ⠿ · colour swatch · name · ▲▼ · eye/lock toggles. Selected = `#23234a` + border;
  drag targets use cyan inset shadow; hidden rows dim to `.4`; lock toggle turns orange `#e07a3c`.

### Dialogs & feedback
- `confirmModal(message, {ok, cancel, danger, title})` → `Promise<bool>`; `cancel:null` = alert.
- `alertModal(message, title)` for errors.
- Both framed by the **french-stitch border**, theme-aware, Esc/backdrop to close, OK auto-focused.
- **Status flash** (`flashSaved(msg)`) is the lightweight success signal (~2.5s, green). Use it for
  non-blocking confirmations; reserve modals for decisions and errors.

### The french-stitch motif
`frenchBorder(w,h,{inset,sp,L,Wd})` draws slanted slit "stitches" (rotated `angle−30°`, the
Vergez-Blanchard slant) around a rectangle. It frames the welcome screen and every dialog — the
product's signature decoration. Reuse it for new framed surfaces rather than inventing a border.

---

## 6. Canvas rendering rules

- Geometry is **mm**; the viewport group carries `translate(panX panY) scale(zoom * PX_PER_MM)`,
  `PX_PER_MM = 3.7795275591`.
- For a **fixed N-pixel** visual size, use `N / (S.zoom*PX)` mm (handles, labels, hit zones).
- Stroke units: with `non-scaling-stroke`, width is screen px; without, it's mm. Use mm widths for
  shape outlines; reserve `non-scaling-stroke` for pixel-exact aids (grid).

---

## 7. Iconography & motion

- Icons are inline glyphs / small inline SVG using `currentColor`. Keep new icons monochrome so they
  inherit theme + state colour.
- Transitions are short (.12–.2s) on background/colour/transform. **No `prefers-reduced-motion`
  guard yet** — see §9.

---

## 8. Accessibility — colour contrast audit

Measured WCAG 2.1 contrast ratios (sRGB). Thresholds: **4.5:1** normal text, **3:1** large text
(≥18px, or ≥14px bold) and UI/graphical objects.

### ✅ Passing (representative)
| Ratio | Pair | Use |
|---|---|---|
| 15.8 | `#eee` / `#12122a` | primary text on panels |
| 13.9 | `#eee` / `#1e1e38` | input text |
| 7.9 | `#aaa` / `#12122a` | tool-button icon, tab text |
| 5.2 | `#888` / `#12122a` | secondary labels (dark) |
| 5.4 | `#fff` / `#c0392b` | primary button label |
| 10.1 | `#c2c2d6` / `#16162c` | dialog body |
| 4.5–6.7 | shape/stitch/cue strokes / `#0d0d1f` | all canvas objects pass 3:1 (dark) |

### ✅ Fixed in v0.7.19 (tokenised)
These were the failures; all now meet AA via the text-tier tokens (one value per tier per theme).

| Was | Old ratio | Role | Token → value | New ratio |
|---|---|---|---|---|
| `#555` | 2.46 | notes / group labels / "no selection" (dark) | `--text-faint` `#8d8da6` | 5.7 |
| `#555` | 2.17 | keyboard hints `.kb` (dark, on raised) | `--text-faint` `#8d8da6` | 5.0 |
| `#666` | 3.19 | status bar text (dark) | `--text-muted` `#9a9ab2` | 6.7 |
| `#777` | 4.09 | muted labels `.p-fl`/`.p-hd` (dark) | `--text-muted` `#9a9ab2` | 6.7 |
| `#6c6c92` | 3.66 | group heading (dark) | `--text-heading` `#8a8ab0` | 5.5 |
| `#fff`/`#e74c3c` | 3.82 | button **hover** fill | `--accent-hover` `#cf3a28` | 4.9 |
| `#888` | 2.84 | secondary labels (light) | `--text-2` `#3f3f4a` | 8.3 |
| `#8888a0` | 2.77 | group heading (light) | `--text-heading` `#54546a` | 5.9 |
| `#999` | 2.29 | notes (light) | `--text-faint` `#5a5a66` | 5.5 |
| `#aaa` | 1.86 | keyboard hints (light) | `--text-faint` `#5a5a66` | 5.5 |
| `#e67e22` | 2.76 | stitch holes on **light** canvas | `--stitch` `#b5640f` (light) | 4.2 |

**Token values now in use** — all ≥ AA on their worst-case surface:

| Tier | Dark | (ratio) | Light | (ratio) |
|---|---|---|---|---|
| `--text` | `#eee` | 15.8 | `#23232e` | 13.6 |
| `--text-2` | `#b9b9c9` | 9.5 | `#3f3f4a` | 8.3 |
| `--text-muted` | `#9a9ab2` | 6.7 | `#5c5c68` | 5.3 |
| `--text-faint` | `#8d8da6` | 5.0–5.7 | `#5a5a66` | 5.5 |
| `--text-heading` | `#8a8ab0` | 5.5 | `#54546a` | 5.9 |

**Note:** print is always black-on-white (`@media print … !important`), so it is unaffected by any
theme/token colour. The tiny `#app-title` version label was also lifted onto `--text-faint`.

---

## 9. Accessibility — structural notes

- **Menus are mouse-only.** `.m-drop` opens on `:hover` (line ~30), not `:focus-within`/click, and
  `.m-item` isn't focusable. Keyboard and assistive-tech users can't open the menu bar (most actions
  do have keyboard shortcuts, which mitigates but doesn't replace this). _Fix:_ open on
  `:focus-within` + click, make `.m-item` focusable (`tabindex`/`<button>`), add `role="menu"`.
- **~21 clickable `<div>`s** (`.m-act`, list rows) are not keyboard-focusable and aren't announced as
  controls. Toolbar items are real `<button>`s (good). _Fix:_ promote interactive divs to `<button>`
  or add `role="button"` + `tabindex="0"` + Enter/Space handlers (the theme toggle already does this).
- **`outline:none` (5×)** removes the focus ring; inputs replace it with an accent border, but some
  focusable elements end up with no visible focus state. _Fix:_ add a visible `:focus-visible` style.
- **Almost no ARIA** (1 `role`, 1 `tabindex`). Toolbar tooltips are CSS `data-tip` only (not exposed
  to screen readers). _Fix:_ add `aria-label` to icon buttons, `aria-pressed` to toggles.
- **No `prefers-reduced-motion`** guard despite transitions. _Fix:_ wrap transitions in a
  `@media (prefers-reduced-motion: no-preference)` query, or disable under `reduce`.
- **Theme is manual only** (no `prefers-color-scheme` default) — acceptable, but defaulting to the
  system preference on first run would be friendlier.

---

## 10. Quick checklist when adding UI

1. Use existing palette tokens (§2) and the spacing/type scale (§3–4) — no new greys or paddings.
2. Reuse a component pattern (§5): property rows, button states, menu rows.
3. Active/selected = accent fill; focus = accent border (and a visible focus ring).
4. Add the `body.light` override for every new element **in the same change**.
5. Decisions/errors → `confirmModal`/`alertModal`; success → `flashSaved`.
6. Framed/welcome surface → reuse `frenchBorder`.
7. Screen-constant canvas sizing → `N/(S.zoom*PX)` mm; print stays black-on-white.
8. **Check contrast ≥ 4.5:1** (text) / 3:1 (large/graphical) against §8 before shipping a new colour.
