# Leather Pattern Designer

A CAD app for designing leather patterns: draw pieces (rectangles, circles, bezier
paths), add wrap-bounded text boxes, simulate saddle stitching, and export or print
at **true physical mm scale** so your printout cuts to size.

[![Latest release](https://img.shields.io/github/v/release/soulagent/leather-pattern-designer?label=download&sort=semver)](https://github.com/soulagent/leather-pattern-designer/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-x64-blue)](https://github.com/soulagent/leather-pattern-designer/releases/latest)

---

## ⬇️ Download (Windows)

**[Download the latest installer →](https://github.com/soulagent/leather-pattern-designer/releases/latest)**

On the release page, under **Assets**, grab the file ending in **`_x64-setup.exe`**,
run it, and you're done. Once installed, the app keeps itself up to date — see
[Updates](#updates) below.

> **Windows SmartScreen warning?** The installer is integrity-signed for the
> auto-updater but is *not* yet code-signed with a paid Authenticode certificate, so
> Windows may show a blue **"Windows protected your PC"** dialog. This is expected.
> Click **More info → Run anyway** to continue. (The download comes straight from this
> repo's GitHub Releases, so it's the genuine build.)

---

## 🌐 Use it in your browser (no install)

The whole app is a single file with no dependencies. If you'd rather not install
anything:

1. Download [`index.html`](index.html) (use the **Download raw file** button on that page).
2. Double-click it — it opens in any modern browser and runs fully offline.

This is always the fallback: every feature works in the browser. The desktop install
just adds native file dialogs, multi-file tabs, `.lpd` file association, and
auto-update.

---

## ✨ Features

- **Drawing tools** — rectangles (per-corner radii), circles, and a pen/bezier path
  tool with per-anchor corner/smooth control. Convert any shape to an editable path.
- **Saddle-stitch simulation** — per-edge stitch lines with evenly-spaced holes and
  geometric corner treatment, matching real stitching-iron spacing.
- **Text boxes** — wrap-bounded, auto-height, with per-run **bold**/*italic* markup.
- **Layout** — multiple named artboards (per-artboard print/export), shape-to-shape
  snapping, multi-select, rotation, rulers, per-shape colour, per-layer hide/lock,
  duplicate / alt-drag duplicate.
- **True-scale output** — native SVG + PNG export and print-to-PDF, all at correct
  physical mm dimensions.
- **Save format** — `.lpd` documents (JSON). Save / Save As / auto-save.
- **Polish** — light + dark themes (WCAG AA), in-app Help + Quick Start, keyboard
  shortcuts throughout.

---

## 🔄 Updates

Installed copies check for updates automatically and via **Help ▸ Check for Updates**.
New versions are signed and pulled from this repo's GitHub Releases, so you never have
to re-download the installer manually.

---

## 🛠️ Build from source

You don't need to build anything to use the app — the browser route above runs the
exact same code. To compile the Windows desktop installer yourself (Tauri v2 + Rust),
see **[`desktop/README.md`](desktop/README.md)** for the toolchain setup and build
commands.

The reference docs for the codebase live in **[`MD files/`](MD%20files/)**
(`CONTEXT.md` for architecture, `DEVLOG.md` for the changelog, `SHORTCUTS.md` for the
key map).
