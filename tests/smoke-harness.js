// ═══════════════════════════════════════════════════════════════════
// Leather Pattern Designer — smoke-test harness
// Injected into a copy of index.html and run in headless Edge.
// Exercises the REAL app logic (state, history, save/load, stitch, bbox).
// Writes results as JSON into <pre id="__smoke_out"> for the runner to read.
//
// Tests are grouped into independently-runnable FEATURES so you can smoke
// just the area you touched (see FEATURES below). The runner passes either a
// tier name ('quick' | 'full') or a comma/space-separated list of feature
// names. Each feature rebuilds its own scene, so any subset can run alone.
// ═══════════════════════════════════════════════════════════════════
window.__SMOKE__ = function (spec) {
  const results = [];
  let aborted = null;

  function assert(name, cond, detail) {
    results.push({ name, pass: !!cond, detail: detail == null ? '' : String(detail) });
  }
  // assert two numbers are equal (with small tolerance for float math)
  function assertNear(name, got, want, tol) {
    tol = tol == null ? 0 : tol;
    const ok = Math.abs(got - want) <= tol;
    assert(name, ok, `got ${got}, want ${want}${tol ? ' ±' + tol : ''}`);
  }

  // Reset to a known-clean state without touching confirm()/localStorage.
  function reset() {
    S.shapes = [];
    S.nextId = 1;
    S.selId = null;
    S.hist = [];
    S.future = [];
    S.penPts = [];
    S.tool = 'select';
    // reset to a single default artboard so features don't contaminate each other
    S.artboards = [{ id: 1, name: 'Untitled', preset: 'A4', orient: 'portrait', w: 210, h: 297, x: 0, y: 0 }];
    S.activeArtboard = 1; S.nextArtboardId = 2; S.selArtboard = null; S.movingArtboard = null;
    // collapse to a single document tab (multi-file tabs, v0.7.13) so leftover tab state can't leak
    if (typeof S.tabs !== 'undefined') { S.tabs = [{ id: 1, title: 'Untitled' }]; S.activeTab = 0; }
    S.fileHandle = null; S.nativePath = null;
    renderContent();
  }

  // Path-point makers — thin readable wrappers over the app's own makePt(x,y,corner),
  // so the stitch features don't each re-declare an identical point literal.
  const corner = (x, y) => makePt(x, y, true);
  const smooth = (x, y) => makePt(x, y, false);

  // Place a 3-anchor open bezier path via the real pen-commit path.
  function placeBezier() {
    S.penPts = [makePt(10, 10, true), makePt(40, 30, true), makePt(70, 10, true)];
    finishPen(false); // pushHist + push shape + select + cancelPen
  }
  // Build the canonical 3-shape scene used by save/load + bbox checks.
  // rect 0,0..100,80 ; circle 130,20..170,60 ; closed triangle bbox 10,100..60,180
  function buildScene() {
    reset();
    addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80, hasStitch: true, stitchMargin: 3, stitchSpacing: 3.38 });
    addShape({ type: 'circle', cx: 150, cy: 40, r: 20, hasStitch: true, stitchMargin: 3, stitchSpacing: 3.38 });
    S.penPts = [makePt(10, 100, true), makePt(60, 140, true), makePt(10, 180, true)];
    finishPen(true);
    return S.shapes[2];
  }

  // ───────────────────────────────────────────────────────────────────
  // FEATURE REGISTRY — each entry is a self-contained block of asserts.
  // ───────────────────────────────────────────────────────────────────
  const FEATURES = {
    // ── shape creation + selection ──
    core() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80, hasStitch: false, stitchMargin: 3, stitchSpacing: 3.38 });
      assert('rect added → count 1', S.shapes.length === 1, `count=${S.shapes.length}`);
      assert('rect added → hist 1', S.hist.length === 1, `hist=${S.hist.length}`);
      assert('rect added → selected', S.selId === S.shapes[0].id, `selId=${S.selId}`);
      addShape({ type: 'circle', cx: 150, cy: 40, r: 20, hasStitch: false, stitchMargin: 3, stitchSpacing: 3.38 });
      assert('circle added → count 2', S.shapes.length === 2, `count=${S.shapes.length}`);
      placeBezier();
      assert('bezier added → count 3', S.shapes.length === 3, `count=${S.shapes.length}`);
      assert('bezier is path type', S.shapes[2] && S.shapes[2].type === 'path', S.shapes[2] && S.shapes[2].type);
      assert('bezier has 3 anchors', S.shapes[2] && S.shapes[2].points.length === 3, S.shapes[2] && S.shapes[2].points.length);
    },

    // ── undo / redo ──
    history() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });
      addShape({ type: 'circle', cx: 150, cy: 40, r: 20 });
      placeBezier();
      assert('history → 3 shapes built', S.shapes.length === 3, `count=${S.shapes.length}`);
      undo(); assert('undo 1 → count 2', S.shapes.length === 2, `count=${S.shapes.length}`);
      undo(); assert('undo 2 → count 1', S.shapes.length === 1, `count=${S.shapes.length}`);
      undo(); assert('undo 3 → count 0', S.shapes.length === 0, `count=${S.shapes.length}`);
      redo(); assert('redo 1 → count 1', S.shapes.length === 1, `count=${S.shapes.length}`);
      assert('redo 1 → first shape is rect', S.shapes[0] && S.shapes[0].type === 'rect', S.shapes[0] && S.shapes[0].type);
    },

    // ── save / load round-trip ──
    saveload() {
      const pathShape = buildScene();
      pathShape.hasStitch = true;
      pathShape.label = 'Gusset';
      pathShape.showLabel = true;
      S.shapes[0].color = '#27ae60'; // colour must survive too
      Object.assign(S.page, { preset: 'A3', orient: 'landscape', w: 420, h: 297, name: 'Wallet/back' });
      S.stitchStyle = 'french';
      // v15 assembly: a 3-member seam (rect edge 0 + path edge 0 + a CIRCLE edge that must be pruned
      // on load since circles have 0 edges), a fold, and a per-piece thickness — all must round-trip.
      S.shapes[0].thickness = 1.6;
      // U6: make it a PARTIAL join with an anchor + a member sub-span, so the v2 fields round-trip.
      S.assembly = { version: 2,
        seams: [{ id: 1, name: 'spine', type: 'stitch', order: 1, allowance: 4, notes: '',
          fit: 'partial', anchor: 'end',
          members: [ { shape: S.shapes[0].id, edge: 0, t0: 0.1, t1: 0.6 }, { shape: S.shapes[2].id, edge: 0 },
                     { shape: S.shapes[1].id, edge: 0 } ] }],   // circle member → pruned by validateSeams
        folds: [{ id: 1, shape: S.shapes[0].id, a: { x: 0, y: 40 }, b: { x: 100, y: 40 }, angle: 90, name: 'main fold' }] };
      const saved = buildSaveData();
      const wire = JSON.parse(JSON.stringify(saved)); // simulate serialize→file→parse
      S.shapes.forEach(normShape); // v14: backfill hidden/locked so load (which normalises) compares equal
      const beforeJSON = JSON.stringify(S.shapes);
      const beforeNextId = S.nextId;
      applyLoadedData(wire);
      assert('round-trip → shape count preserved', S.shapes.length === 3, `count=${S.shapes.length}`);
      assert('round-trip → geometry identical', JSON.stringify(S.shapes) === beforeJSON, 'shapes JSON mismatch');
      assert('round-trip → nextId preserved', S.nextId === beforeNextId, `got ${S.nextId}, want ${beforeNextId}`);
      assert('round-trip → version is 15', saved.version === 15, `version=${saved.version}`);
      // v15 assembly round-trip + validation
      assert('round-trip → assembly present, 1 seam', S.assembly && S.assembly.seams.length === 1, `seams=${S.assembly && S.assembly.seams.length}`);
      assert('round-trip → seam fields preserved', S.assembly.seams[0].name === 'spine' && S.assembly.seams[0].type === 'stitch' && S.assembly.seams[0].order === 1 && S.assembly.seams[0].allowance === 4, JSON.stringify(S.assembly.seams[0]));
      assert('validateSeams → circle member pruned (3→2)', S.assembly.seams[0].members.length === 2, `members=${S.assembly.seams[0].members.length}`);
      // U6: partial-join fields survive save→load
      assert('round-trip → fit/anchor preserved', S.assembly.seams[0].fit === 'partial' && S.assembly.seams[0].anchor === 'end', JSON.stringify(S.assembly.seams[0]));
      assert('round-trip → member sub-span preserved', S.assembly.seams[0].members[0].t0 === 0.1 && S.assembly.seams[0].members[0].t1 === 0.6, JSON.stringify(S.assembly.seams[0].members[0]));
      assert('partial seam → length hint suppressed', seamLengthIssues(S.assembly.seams[0]).length === 0);
      assert('round-trip → fold preserved (angle 90)', S.assembly.folds.length === 1 && S.assembly.folds[0].angle === 90, JSON.stringify(S.assembly.folds));
      assert('round-trip → per-piece thickness preserved', S.shapes[0].thickness === 1.6, `thickness=${S.shapes[0].thickness}`);
      assert('seamForEdge → derived map resolves a member', seamForEdge(S.shapes[0].id, 0) === S.assembly.seams[0], 'map miss');
      assert('seamForEdge → pruned/absent edge = null', seamForEdge(S.shapes[1].id, 0) === null, 'circle edge unexpectedly mapped');
      assert('v14 file (no assembly) → empty assembly default', normAssembly(undefined).seams.length === 0 && normAssembly(undefined).version === 5);
      // assembly-schema v4: mm partial join (offset + reference end) survives normalise/round-trip
      const mmM = normMember({ shape: 8, edge: 1, offset: 12, from: 'end' });
      assert('round-trip → mm offset/from preserved', mmM.offset === 12 && mmM.from === 'end', JSON.stringify(mmM));
      assert('round-trip → mm member drops legacy t0/t1', mmM.t0 === undefined && mmM.t1 === undefined, JSON.stringify(mmM));
      assert('round-trip → settings.defSpacing preserved', saved.settings.defSpacing === S.defSpacing, `${saved.settings.defSpacing} vs ${S.defSpacing}`);
      assert('round-trip → settings.stitchStyle preserved', S.stitchStyle === 'french', `stitchStyle=${S.stitchStyle}`);
      assert('round-trip → shape label preserved', S.shapes[2].label === 'Gusset' && S.shapes[2].showLabel === true, `label=${S.shapes[2].label}, show=${S.shapes[2].showLabel}`);
      assert('round-trip → shape colour preserved', S.shapes[0].color === '#27ae60', `color=${S.shapes[0].color}`);
      assert('round-trip → page preset preserved', S.page.preset === 'A3', `preset=${S.page.preset}`);
      assert('round-trip → page orient preserved', S.page.orient === 'landscape', `orient=${S.page.orient}`);
      assert('round-trip → page dims preserved', S.page.w === 420 && S.page.h === 297, `${S.page.w}x${S.page.h}`);
      assert('round-trip → artboard name preserved', S.page.name === 'Wallet/back', `name=${S.page.name}`);
      assert('doc name follows artboard, sanitised for filename', docName() === 'Wallet-back', `docName=${docName()}`);
    },

    // ── page preset / orientation logic ──
    page() {
      Object.assign(S.page, { preset: 'A4', orient: 'portrait', w: 0, h: 0 });
      applyPageDims();
      assert('A4 portrait dims = 210x297', S.page.w === 210 && S.page.h === 297, `${S.page.w}x${S.page.h}`);
      togglePageOrient();
      assert('A4 landscape dims = 297x210', S.page.w === 297 && S.page.h === 210, `${S.page.w}x${S.page.h}`);
    },

    // ── per-shape outline colour ──
    color() {
      reset();
      // shapeColor() still falls back to the default for a shape with no explicit colour
      assert('colour: shapeColor falls back to default when unset', shapeColor({ type: 'rect', x: 0, y: 0, w: 5, h: 5 }) === DEFAULT_SHAPE_COLOR, `got ${shapeColor({ type: 'rect' })}`);
      assert('colour: palette has entries', Array.isArray(SHAPE_COLORS) && SHAPE_COLORS.length >= 4, `n=${SHAPE_COLORS.length}`);
      // new shapes cycle the presets, looping back after the last
      _colorCycle = 0;
      assert('colour: cycle starts at preset[0]', nextShapeColor() === SHAPE_COLORS[0], 'start');
      assert('colour: cycle advances to preset[1]', nextShapeColor() === SHAPE_COLORS[1], 'advance');
      _colorCycle = SHAPE_COLORS.length - 1; nextShapeColor();
      assert('colour: cycle wraps back to preset[0]', nextShapeColor() === SHAPE_COLORS[0], 'wrap');
      // peek shows the next colour WITHOUT consuming it (pen WYSIWYG preview); next still returns it
      _colorCycle = 0;
      assert('colour: peek returns the next colour', peekShapeColor() === SHAPE_COLORS[0], `got ${peekShapeColor()}`);
      assert('colour: peek does not advance the cycle', _colorCycle === 0, `cycle=${_colorCycle}`);
      assert('colour: next after peek returns the peeked colour', nextShapeColor() === SHAPE_COLORS[0] && _colorCycle === 1, 'mismatch');
      _colorCycle = 0;
      const r = { type: 'rect', x: 0, y: 0, w: 50, h: 50 }; addShape(r);
      assert('colour: addShape assigns the cycling default', r.color === SHAPE_COLORS[0], `got ${r.color}`);
      // an explicit colour overrides the cycle + survives a round-trip
      r.color = '#e84393';
      assert('colour: explicit value used', shapeColor(r) === '#e84393', `got ${shapeColor(r)}`);
      const wire = JSON.parse(JSON.stringify(buildSaveData()));
      applyLoadedData(wire);
      assert('colour: survives round-trip', S.shapes[0].color === '#e84393', `color=${S.shapes[0].color}`);
    },

    // ── shape-to-shape alignment snapping ──
    snap() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });        // target A
      addShape({ type: 'rect', x: 200, y: 300, w: 50, h: 50 });     // mover B (selected)
      // B nudged so its left edge sits 2mm right of A's left edge (x=0)
      const box = { x1: 2, y1: 300, x2: 52, y2: 350, cx: 27, cy: 325 };
      const snap = computeSnap(box, 5);
      assertNear('snap: left edges align (dx=-2)', snap.dx, -2, 1e-6);
      assert('snap: emits a vertical guide at x=0', snap.guides.some(g => g.type === 'v' && Math.abs(g.pos) < 1e-6), JSON.stringify(snap.guides));
      // far away → no snap, no guides
      const far = computeSnap({ x1: 500, y1: 500, x2: 550, y2: 550, cx: 525, cy: 525 }, 5);
      assert('snap: nothing snaps when far', far.dx === 0 && far.dy === 0 && far.guides.length === 0, `dx=${far.dx} dy=${far.dy} g=${far.guides.length}`);
      // self is excluded: snapping against only itself yields nothing
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });        // this one is selected
      const onlySelf = computeSnap(shapeSnapBox(S.shapes[0]), 5);
      assert('snap: excludes the selected shape', onlySelf.dx === 0 && onlySelf.dy === 0, `dx=${onlySelf.dx} dy=${onlySelf.dy}`);
    },

    // ── stitch dot count sanity: rectangle ──
    'stitch-rect'() {
      const rect = { type: 'rect', x: 0, y: 0, w: 100, h: 80, hasStitch: true, stitchMargin: 3, stitchSpacing: 3.38 };
      const stR = stitchRect(rect);
      const m = 3, sp = 3.38, iw = rect.w - 2 * m, ih = rect.h - 2 * m;
      const edgeN = L => Math.max(1, Math.round(L / sp)); // even distribution → N equal steps per edge
      const expected = 2 * edgeN(iw) + 2 * edgeN(ih);
      assert('rect stitch returns dots', stR && stR.pts.length > 0, stR && stR.pts.length);
      assertNear('rect stitch dot count = even per-edge distribution', stR ? stR.pts.length : -1, expected, 0);
      const forced = stR.pts.filter(p => p.forced);
      assert('rect stitch forces 4 corner holes', forced.length === 4, `forced=${forced.length}`);
      const x1 = rect.x + m, y1 = rect.y + m, x2 = rect.x + rect.w - m, y2 = rect.y + rect.h - m;
      const corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
      const onCorner = p => corners.some(c => Math.abs(p.x - c[0]) < 1e-6 && Math.abs(p.y - c[1]) < 1e-6);
      assert('rect corner holes lie exactly on corners', forced.every(onCorner), 'a forced hole was off-corner');
      // a full edge row picks up its far corner from the perpendicular edge → uniform N+1 grid
      const topRow = stR.pts.filter(p => Math.abs(p.y - y1) < 1e-6).map(p => p.x).sort((a, b) => a - b);
      const botRow = stR.pts.filter(p => Math.abs(p.y - y2) < 1e-6).map(p => p.x).sort((a, b) => a - b);
      assert('rect top edge has ≥3 holes', topRow.length >= 3, `n=${topRow.length}`);
      assertNear('rect stitch spacing uniform', topRow[2] - topRow[1], topRow[1] - topRow[0], 1e-6);
      assertNear('rect stitch spacing ~= target', topRow[1] - topRow[0], iw / edgeN(iw), 1e-6);
      assert('rect top row hits both corners',
        Math.abs(topRow[0] - x1) < 1e-6 && Math.abs(topRow[topRow.length - 1] - x2) < 1e-6, `${topRow[0]}..${topRow[topRow.length - 1]}`);
      // the whole point: parallel edges line up — top and bottom rows share identical x positions
      assert('rect parallel edges aligned (top x == bottom x)',
        topRow.length === botRow.length && topRow.every((x, i) => Math.abs(x - botRow[i]) < 1e-6), `top=${topRow.length} bot=${botRow.length}`);
    },

    // ── per-edge stitching ──
    peredge() {
      const r2 = { type: 'rect', x: 0, y: 0, w: 100, h: 80, hasStitch: true, stitchMargin: 3, stitchSpacing: 3.38 };
      assert('per-edge: default stitches all 4 edges', [0, 1, 2, 3].every(e => edgeStitched(r2, e)), 'not all on');
      setEdgeStitch(r2, 1, false); setEdgeStitch(r2, 3, false);
      assert('per-edge: top+bottom stay on', edgeStitched(r2, 0) && edgeStitched(r2, 2), 'top/bottom off');
      assert('per-edge: sides turned off', !edgeStitched(r2, 1) && !edgeStitched(r2, 3), 'sides still on');
      const st2 = stitchRect(r2);
      const ey1 = r2.y + 3, ey2 = r2.y + r2.h - 3;
      assert('per-edge: holes only on the stitched edges',
        st2.pts.every(p => Math.abs(p.y - ey1) < 1e-6 || Math.abs(p.y - ey2) < 1e-6), 'a hole was off the stitched edges');
      [0, 1, 2, 3].forEach(e => setEdgeStitch(r2, e, true));
      assert('per-edge: all-on compacts to undefined', r2.stitchEdges === undefined && r2.hasStitch === true, `stitchEdges=${r2.stitchEdges}`);
      [0, 1, 2, 3].forEach(e => setEdgeStitch(r2, e, false));
      assert('per-edge: all-off clears hasStitch', r2.hasStitch === false, `hasStitch=${r2.hasStitch}`);
      // ── edge-list UI (todo #1): labels + row rendering mirror per-edge state ──
      assert('edge label: rect edges read T/R/B/L',
        edgeLabel(r2, 0) === 'Top' && edgeLabel(r2, 1) === 'Right' && edgeLabel(r2, 2) === 'Bottom' && edgeLabel(r2, 3) === 'Left', 'rect labels wrong');
      assert('edge label: path edges numbered', edgeLabel({ type: 'path' }, 0) === 'Edge 1', 'path label wrong');
      r2.hasStitch = true; r2.stitchEdges = [0, 2]; // top + bottom only
      renderEdgeStitchList(r2);
      const rows = document.querySelectorAll('#edge-stitch-list .es-row');
      assert('edge list: one row per edge', rows.length === 4, `rows=${rows.length}`);
      const chk = [...rows].map(r => r.querySelector('input').checked);
      assert('edge list: checkboxes mirror edgeStitched', chk[0] && !chk[1] && chk[2] && !chk[3], `checked=${chk}`);
    },

    // ── empty-state invitation (todo #2): no-selection panel is an actionable prompt ──
    emptystate() {
      S.shapes = []; S.selIds = []; S.selId = null;
      updatePropsPanel();
      const ns = document.getElementById('no-sel-msg');
      assert('empty-state: shown when nothing is selected', ns.style.display !== 'none', `display=${ns.style.display}`);
      assert('empty-state: blank doc invites a first piece', document.getElementById('ns-title').textContent === 'Start your pattern', document.getElementById('ns-title').textContent);
      assert('empty-state: offers three draw tools', document.querySelectorAll('#no-sel-msg .ns-tool').length === 3, 'tool count');
      S.shapes = [{ type: 'rect', id: 1, x: 0, y: 0, w: 10, h: 10 }]; S.nextId = 2; S.selIds = []; S.selId = null;
      updatePropsPanel();
      assert('empty-state: populated doc says no selection', document.getElementById('ns-title').textContent === 'No shape selected', document.getElementById('ns-title').textContent);
    },

    // ── toolbar + tool UX (todos #3–#6) ──
    toolux() {
      // #3 per-tool status hints
      assert('tool hints: map covers the tools', ['select', 'rotate', 'rect', 'pen', 'text', 'seam'].every(k => TOOL_HINTS[k]), 'missing hint');
      applyToolChrome('rotate');
      assert('tool hints: status hint set for the active tool', /rotate/i.test(document.getElementById('st-hint').textContent), document.getElementById('st-hint').textContent);
      // #4 unified icons + Delete pulled from the tool column
      const tbtns = [...document.querySelectorAll('#toolbar .t-btn')];
      assert('toolbar: no Delete button in the tool column', !tbtns.some(b => /delete/i.test(b.getAttribute('data-tip') || '')), 'delete still present');
      assert('toolbar: tools use inline svg icons', document.querySelectorAll('#toolbar .t-btn svg').length >= 6, 'too few svg icons');
      // #5 shortcut key badges
      assert('toolbar: shortcut key badges present', document.querySelectorAll('#toolbar .t-key').length === 6, `keys=${document.querySelectorAll('#toolbar .t-key').length}`);
      // Select sits at the very top of the column (default-arrow convention); Home was moved below it
      // so it's no longer fired by a stray reach for Select.
      const tbIds = [...document.querySelectorAll('#toolbar .t-btn')].map(b => b.id);
      assert('toolbar: Select is the first tool', tbIds[0] === 'tb-select', tbIds.join(','));
      assert('toolbar: Home sits below Select', tbIds.indexOf('tb-home') > tbIds.indexOf('tb-select'), tbIds.join(','));
      // #6 empty-canvas prompt
      S.shapes = [];
      updateCanvasEmpty();
      const ce = document.getElementById('canvas-empty');
      assert('empty-canvas: prompt shown on a blank document', !ce.classList.contains('hidden'), 'hidden when empty');
      assert('empty-canvas: french-stitch border built', document.querySelectorAll('#canvas-empty-stitch rect').length > 0, 'no slits');
      S.shapes = [{ type: 'rect', id: 1, x: 0, y: 0, w: 10, h: 10 }];
      updateCanvasEmpty();
      assert('empty-canvas: prompt hidden once a piece exists', ce.classList.contains('hidden'), 'still shown');
      // #6 entry view: the active artboard is framed centred (not hugging the top-left)
      S.shapes = []; S.pan = { x: -999, y: -999 }; S.zoom = 1;
      centerOnArtboard();
      const rc = document.getElementById('cvs').getBoundingClientRect(), ab = S.page;
      assert('entry view: artboard centred horizontally', Math.abs((S.pan.x + (ab.x + ab.w / 2) * S.zoom * PX) - rc.width / 2) < 1, 'off-centre x');
      assert('entry view: artboard centred vertically', Math.abs((S.pan.y + (ab.y + ab.h / 2) * S.zoom * PX) - rc.height / 2) < 1, 'off-centre y');
      // #8 Settings reachable via a menubar gear (moved out of the Edit menu)
      assert('settings: menubar gear present', !!document.getElementById('mb-settings'), 'no gear');
      // #9 Assembly panel points to the 3D companion app
      assert('assembly: points to Leather Studio 3D', /Leather Studio 3D/.test(document.getElementById('body-assembly').textContent), 'no 3D pointer');
    },

    // ── stitch dot count sanity: circle ──
    'stitch-circle'() {
      const circ = { type: 'circle', cx: 150, cy: 40, r: 20, hasStitch: true, stitchMargin: 3, stitchSpacing: 3.38 };
      const stC = stitchCircle(circ);
      const m = 3, sp = 3.38, r = circ.r - m, circum = 2 * Math.PI * r;
      const expected = Math.max(8, Math.round(circum / sp));
      assert('circle stitch returns dots', stC && stC.pts.length > 0, stC && stC.pts.length);
      assertNear('circle stitch dot count = round(circumference/spacing)', stC ? stC.pts.length : -1, expected, 0);
    },

    // ── stitch on closed path (3 corner anchors → 3 highlighted corner holes) ──
    'stitch-path'() {
      const pathShape = buildScene();
      pathShape.hasStitch = true;
      const stP = stitchPath(pathShape);
      assert('path stitch returns dots', stP && stP.pts.length > 0, stP && stP.pts.length);
      const stpHl = stP ? stP.pts.filter(p => p.hl) : [];
      assert('path stitch highlights 3 corners', stpHl.length === 3, `hl=${stpHl.length}`);
    },

    // ── converted rect must stitch its corners identically to the rect tool ──
    // (miter offset: corner inset by m from BOTH edges, not just along the diagonal)
    'stitch-convert'() {
      const m = 3, sp = 4;
      const rect = { type: 'rect', x: 0, y: 0, w: 100, h: 40, hasStitch: true, stitchMargin: m, stitchSpacing: sp };
      const path = { type: 'path', closed: true, hasStitch: true, stitchMargin: m, stitchSpacing: sp,
        points: [corner(0, 0), corner(100, 0), corner(100, 40), corner(0, 40)] };
      const stp = stitchPath(path);
      const rc = stitchRect(rect).pts.filter(p => p.hl);
      const pc = stp.pts.filter(p => p.hl);
      assert('converted-path highlights 4 corners (= rect tool)', rc.length === 4 && pc.length === 4, `rect=${rc.length} path=${pc.length}`);
      // every rect corner hole must have a path corner hole within 0.3mm (i.e. same inset)
      const maxErr = Math.max(...rc.map(r => Math.min(...pc.map(p => Math.hypot(p.x - r.x, p.y - r.y)))));
      assertNear('converted corners match rect corners (miter inset)', maxErr, 0, 0.3);
      // orientation: EVERY hole (incl. corners) follows an edge → on an axis-aligned square all
      // angles are ~0/90deg. Corner slits match the run they sit in, not a diagonal bisector.
      const mod90 = p => { let d = (((p.a * 180 / Math.PI) % 90) + 90) % 90; return Math.min(d, 90 - d); };
      assertNear('all holes (incl. corners) orient to an edge (0/90deg)', Math.max(...stp.pts.map(mod90)), 0, 3);
      // no corner bunching: on a square (all edges equal) every gap incl. the wrap is uniform.
      // The old offset-path backtrack left a short ~sp/1.6 gap into each corner; trimming it fixes that.
      // 50x50, m=3 → inset 44; 44/4 = 11 exactly, so N is stable (40x40 lands on the .5 round boundary).
      const sq = { type: 'path', closed: true, hasStitch: true, stitchMargin: m, stitchSpacing: sp,
        points: [corner(0, 0), corner(50, 0), corner(50, 50), corner(0, 50)] };
      const sp2 = stitchPath(sq).pts;
      const gaps = sp2.map((p, i) => { const q = sp2[(i + 1) % sp2.length]; return Math.hypot(p.x - q.x, p.y - q.y); });
      assertNear('converted square: corner gaps match edge gaps (no bunching)', Math.max(...gaps) - Math.min(...gaps), 0, 0.1);
      // a square drawn with the pen in SMOOTH mode makes corner:false anchors with coincident
      // handles — geometrically sharp. Harsh detection is geometric, so it must stitch identically
      // (forced corner + uniform spacing), not bunch. This is what kept "happening".
      const smoothSq = { type: 'path', closed: true, hasStitch: true, stitchMargin: m, stitchSpacing: sp,
        points: [smooth(0, 0), smooth(50, 0), smooth(50, 50), smooth(0, 50)] };
      const sg = stitchPath(smoothSq).pts;
      const sgaps = sg.map((p, i) => { const q = sg[(i + 1) % sg.length]; return Math.hypot(p.x - q.x, p.y - q.y); });
      assert('smooth-flagged sharp corners detected geometrically (4 forced)', sg.filter(p => p.hl).length === 4, `hl=${sg.filter(p => p.hl).length}`);
      assertNear('smooth-flagged square: no corner bunching', Math.max(...sgaps) - Math.min(...sgaps), 0, 0.1);
    },

    // ── acute corners must not pile up overlapping holes (min-gap pass + miter cap) ──
    'stitch-acute'() {
      const m = 3, sp = 4;
      // thin sliver triangle → two sharp acute corners at the left and right tips
      const tri = { type: 'path', closed: true, hasStitch: true, stitchMargin: m, stitchSpacing: sp,
        points: [corner(0, 0), corner(120, 0), corner(0, 12)] };
      const st = stitchPath(tri);
      assert('acute path stitches', st && st.pts.length > 0, st && st.pts.length);
      // no two consecutive holes (incl. the closed wrap) closer than ~half the spacing
      let minD = Infinity;
      for (let i = 0; i < st.pts.length; i++) {
        const a = st.pts[i], b = st.pts[(i + 1) % st.pts.length];
        minD = Math.min(minD, Math.hypot(a.x - b.x, a.y - b.y));
      }
      assert('acute corners: no overlapping/piled holes (gap >= sp/2)', minD >= sp * 0.5 - 0.01, `minGap=${minD.toFixed(2)}`);
      // miter cap: every corner hole stays within ~2*m of its vertex (no centroid spike)
      const verts = tri.points;
      const maxInset = Math.max(...st.pts.filter(p => p.hl).map(p => Math.min(...verts.map(v => Math.hypot(p.x - v.x, p.y - v.y)))));
      assert('acute corner holes capped near their vertex (<=2m)', maxInset <= m * 2 + 0.5, `maxInset=${maxInset.toFixed(2)}`);
    },

    // ── regression: a rect with MIXED corner radii must not bunch stitch holes (v0.4.11) ──
    // A zero-radius corner used to emit two coincident anchors (zero-length segment), which made
    // stitchPath's corner math degenerate and pile holes. roundedRectPathPts now emits a single
    // sharp anchor for r=0, so a mixed-radius rect stitches as cleanly as the rect tool.
    'stitch-radii'() {
      reset();
      const sp = 3.38;
      // 30x30 square, only the top-left corner rounded (0.5), the other three sharp (0)
      addShape({ type: 'rect', x: 0, y: 0, w: 30, h: 30, hasStitch: true, stitchMargin: 3, stitchSpacing: sp, radii: [0.5, 0, 0, 0] });
      const sh = S.shapes[S.shapes.length - 1];

      // path shape: 3 sharp corners (1 anchor each) + 1 rounded corner (2 arc anchors) = 5, none coincident
      const pp = roundedRectPathPts(sh);
      assert('mixed-radius path: 5 anchors (3 sharp + 1 rounded)', pp.length === 5, `${pp.length}`);
      assert('mixed-radius path: 3 sharp corner anchors', pp.filter(p => p.corner).length === 3, `${pp.filter(p => p.corner).length}`);
      let minAnchorGap = Infinity;
      for (let i = 0; i < pp.length; i++) {
        const a = pp[i], b = pp[(i + 1) % pp.length];
        minAnchorGap = Math.min(minAnchorGap, Math.hypot(a.x - b.x, a.y - b.y));
      }
      assert('mixed-radius path: no coincident anchors (was the bug)', minAnchorGap > 1e-3, `minAnchorGap=${minAnchorGap}`);

      // stitch holes: none piled (every consecutive gap >= ~sp/2), like the acute-corner guard
      const st = stitchFor(sh);
      assert('mixed-radius stitch returns holes', st && st.pts.length > 4, st ? `${st.pts.length}` : 'null');
      let minD = Infinity;
      for (let i = 0; i < st.pts.length; i++) {
        const a = st.pts[i], b = st.pts[(i + 1) % st.pts.length];
        minD = Math.min(minD, Math.hypot(a.x - b.x, a.y - b.y));
      }
      assert('mixed-radius: no piled/bunched holes (gap >= sp/2)', minD >= sp * 0.5 - 0.01, `minGap=${minD.toFixed(2)}`);

      // each sharp corner forces exactly one highlighted hole — not the doubled corner holes from the bug
      assert('mixed-radius: 3 forced corner holes (not doubled)', st.pts.filter(p => p.hl).length === 3, `hl=${st.pts.filter(p => p.hl).length}`);
    },

    // ── convert a path anchor between corner (sharp) and smooth (curved) ──
    'anchor-type'() {
      reset();
      S.penPts = [makePt(0, 0, true), makePt(50, 20, true), makePt(100, 0, true)];
      finishPen(false);
      const sh = S.shapes[0];
      S.selId = sh.id; S.selAnchor = 1;
      setAnchorType(false); // → smooth
      assert('anchor → smooth clears corner flag', sh.points[1].corner === false, sh.points[1].corner);
      const p = sh.points[1];
      assert('smooth anchor gets non-degenerate handles', p.cp1x !== p.x || p.cp2x !== p.x, `cp1x=${p.cp1x} x=${p.x}`);
      setAnchorType(true); // → corner
      assert('anchor → corner sets corner flag', sh.points[1].corner === true, sh.points[1].corner);
      const c = sh.points[1];
      assert('corner anchor collapses handles onto the point',
        c.cp1x === c.x && c.cp1y === c.y && c.cp2x === c.x && c.cp2y === c.y, `cp=(${c.cp1x},${c.cp1y})/(${c.cp2x},${c.cp2y})`);
    },

    // ── pen Shift = snap the candidate anchor to the grid (replaced the old angle-snap) ──
    'pen-grid'() {
      reset();
      S.snap = false; S.snapMM = 1;
      S.penPts = [makePt(0, 0, true)];
      const p = penPoint({ x: 10.4, y: 2.7 }, true);   // Shift pins to the 1mm grid
      assert('pen Shift snaps x to grid', p.x === 10, `x=${p.x}`);
      assert('pen Shift snaps y to grid', p.y === 3, `y=${p.y}`);
      const free = penPoint({ x: 10.4, y: 2.7 }, false); // no Shift, global snap off → free
      assert('pen no-Shift + snap off → free', free.x === 10.4 && free.y === 2.7, `(${free.x},${free.y})`);
      S.penPts = [];
      const g = penPoint({ x: 5.6, y: 9.1 }, true);    // works on the first point too (no prev anchor needed)
      assert('pen Shift snaps the first point too', g.x === 6 && g.y === 9, `(${g.x},${g.y})`);
    },

    // ── pen anchor geometry: click → corner, click-drag → smooth (no mode toggle) ──
    'pen-anchor'() {
      reset();
      S.snap = false;
      const last = () => S.penPts[S.penPts.length - 1];

      // plain click (down, no drag, up) → corner anchor with collapsed handles
      S.penLastDown = 0; // avoid double-click detection between synthetic downs
      penMouseDown({ x: 0, y: 0 }, false);
      penMouseUp();
      const c = last();
      assert('click → corner anchor', c.corner === true, `${c.corner}`);
      assert('corner handles collapsed onto anchor',
        c.cp1x === c.x && c.cp1y === c.y && c.cp2x === c.x && c.cp2y === c.y, 'handles');

      // click-drag (down, move past threshold, up) → smooth anchor
      S.penLastDown = 0;
      penMouseDown({ x: 50, y: 0 }, false);
      penMouseMove({ x: 60, y: 10 }, false);
      const s = last();
      assert('drag → smooth anchor', s.corner === false, `${s.corner}`);
      assert('smooth out-handle follows the drag', s.cp2x > s.x && s.cp2y > s.y, `${s.cp2x},${s.cp2y}`);
      assert('smooth in-handle is the reflection',
        Math.abs((s.cp1x - s.x) + (s.cp2x - s.x)) < 1e-9 &&
        Math.abs((s.cp1y - s.y) + (s.cp2y - s.y)) < 1e-9, 'reflect');
      penMouseUp();

      // dragging out then back under the threshold before release reverts to a corner
      S.penLastDown = 0;
      penMouseDown({ x: 100, y: 0 }, false);
      penMouseMove({ x: 130, y: 0 }, false);
      assert('moved out → smooth (live)', last().corner === false, `${last().corner}`);
      penMouseMove({ x: 100, y: 0 }, false);
      const r = last();
      assert('dragged back under threshold → corner again', r.corner === true, `${r.corner}`);
      assert('reverted handles collapse', r.cp2x === r.x && r.cp2y === r.y, 'collapse');
      penMouseUp();
    },

    // ── pen close cue + Backspace point-undo (v0.7.7) ──
    'pen-close'() {
      reset();
      S.tool = 'pen'; S.snap = false; S.penDown = false;
      S.penPts = [makePt(0, 0, true), makePt(50, 0, true), makePt(50, 40, true)];

      // penCloseHit: true only within range of the FIRST anchor, and only with >=2 points
      assert('penCloseHit: near first anchor → true', penCloseHit({ x: 1, y: 1 }) === true, 'should hit');
      assert('penCloseHit: far from first anchor → false', penCloseHit({ x: 20, y: 20 }) === false, 'should miss');
      S.penPts = [makePt(0, 0, true)];
      assert('penCloseHit: <2 points → never closes', penCloseHit({ x: 0, y: 0 }) === false, 'should not close a stub');

      // penClosing() gates on tool + hover (not mid-drag)
      S.penPts = [makePt(0, 0, true), makePt(50, 0, true), makePt(50, 40, true)];
      S.cursorMM = { x: 1, y: 1 };
      assert('penClosing: hovering the first anchor → true', penClosing() === true, 'should be closing');
      S.penDown = true;
      assert('penClosing: mid-drag suppresses the cue', penClosing() === false, 'drag should suppress');
      S.penDown = false;
      S.cursorMM = { x: 30, y: 30 };
      assert('penClosing: cursor away → false', penClosing() === false, 'should be off');

      // render emits the close cue circle only while closing
      S.cursorMM = { x: 1, y: 1 };
      assert('render: close cue shown near first anchor', /pen-close-cue/.test(renderPenInProgress()), 'no cue');
      S.cursorMM = { x: 30, y: 30 };
      assert('render: no close cue when away', !/pen-close-cue/.test(renderPenInProgress()), 'cue leaked');

      // WYSIWYG: committed segments preview in the finished-shape colour (peek), not the old cyan chrome,
      // and rendering the preview must NOT consume the colour cycle.
      S.penResume = null; _colorCycle = 0;
      const penPrev = renderPenInProgress();
      assert('pen: committed preview uses the finished-shape colour', penPrev.includes(`stroke="${peekShapeColor()}"`), 'no tinted committed stroke');
      assert('pen: preview no longer uses the old cyan chrome stroke', !penPrev.includes('#4dd2ff'), 'cyan leaked');
      assert('pen: rendering the preview does not consume the cycle', _colorCycle === 0, `cycle=${_colorCycle}`);

      // clicking in closing range finishes a CLOSED path
      reset();
      S.tool = 'pen'; S.snap = false; S.penLastDown = 0;
      S.penPts = [makePt(0, 0, true), makePt(50, 0, true), makePt(50, 40, true)];
      const nBefore = S.shapes.length;
      penMouseDown({ x: 1, y: 1 }, false); // within close range of the first anchor
      assert('close click → one new path', S.shapes.length === nBefore + 1, `${S.shapes.length}`);
      assert('close click → path is closed', S.shapes[S.shapes.length - 1].closed === true, 'not closed');
      assert('close click → pen state cleared', S.penPts.length === 0, `${S.penPts.length}`);

      // Backspace point-undo: pops the last anchor, never touches the document undo stack
      reset();
      S.tool = 'pen'; S.snap = false;
      S.penPts = [makePt(0, 0, true), makePt(50, 0, true), makePt(50, 40, true)];
      const histBefore = S.hist.length;
      penUndoPoint();
      assert('penUndoPoint: drops the last anchor', S.penPts.length === 2, `${S.penPts.length}`);
      assert('penUndoPoint: no document history entry', S.hist.length === histBefore, `hist ${S.hist.length}`);
      penUndoPoint(); penUndoPoint();
      assert('penUndoPoint: empties the path at zero', S.penPts.length === 0, `${S.penPts.length}`);
      penUndoPoint(); // safe on an empty path
      assert('penUndoPoint: no-op when already empty', S.penPts.length === 0, 'should stay empty');

      // ── spline closure: smooth first/last anchors get tangent-continuous handles on close ──
      reset();
      S.tool = 'pen'; S.snap = false; S.penLastDown = 0;
      const sm = (x, y) => { const p = makePt(x, y, true); p.corner = false; return p; };
      S.penPts = [sm(0, 0), makePt(50, 0, true) /* corner middle */, sm(50, 40)];
      finishPen(true);
      const cp = S.shapes[S.shapes.length - 1].points;
      assert('spline closure: smooth first anchor gets handles',
        cp[0].cp2x !== cp[0].x || cp[0].cp2y !== cp[0].y, 'collapsed');
      assert('spline closure: smooth last anchor gets handles',
        cp[2].cp1x !== cp[2].x || cp[2].cp1y !== cp[2].y, 'collapsed');
      assert('spline closure: first anchor handles reflect (smooth/collinear)',
        Math.abs((cp[0].cp1x - cp[0].x) + (cp[0].cp2x - cp[0].x)) < 1e-9 &&
        Math.abs((cp[0].cp1y - cp[0].y) + (cp[0].cp2y - cp[0].y)) < 1e-9, 'not reflected');
      assert('spline closure: corner anchor left sharp',
        cp[1].corner === true && cp[1].cp1x === cp[1].x && cp[1].cp2x === cp[1].x, 'corner changed');

      // an OPEN finish never smooths — handles stay where they were
      reset();
      S.tool = 'pen'; S.snap = false;
      S.penPts = [sm(0, 0), makePt(50, 0, true), sm(50, 40)];
      finishPen(false);
      const op = S.shapes[S.shapes.length - 1].points;
      assert('open finish: no spline-closure smoothing',
        op[0].cp2x === op[0].x && op[0].cp2y === op[0].y, 'smoothed an open path');
    },

    // ── pen placement ghost + resume-an-open-path (v0.7.8) ──
    'pen-resume'() {
      reset();
      S.tool = 'pen'; S.snap = false; S.penDown = false; S.penPts = [];

      // placement ghost shows where the next click will land when idle (no resume target nearby)
      S.cursorMM = { x: 200, y: 200 };
      assert('render: placement ghost shown when idle', /pen-ghost/.test(renderPenInProgress()), 'no ghost');

      addShape({ type: 'path', points: [makePt(0, 0, true), makePt(50, 0, true), makePt(50, 40, true)], closed: false, color: '#27ae60', hasStitch: true, stitchMargin: 3, stitchSpacing: 3.5 });
      const id = S.shapes[0].id;

      // penResumeTarget: endpoints only, open + un-rotated only, and not mid-draw
      let t = penResumeTarget({ x: 50, y: 40 });
      assert('resume: hovering the last anchor → end last', !!t && t.id === id && t.end === 'last', JSON.stringify(t));
      t = penResumeTarget({ x: 0, y: 0 });
      assert('resume: hovering the first anchor → end first', !!t && t.end === 'first', JSON.stringify(t));
      assert('resume: far from any endpoint → null', penResumeTarget({ x: 25, y: 20 }) === null, 'should miss');
      S.shapes[0].closed = true;
      assert('resume: closed path not resumable', penResumeTarget({ x: 50, y: 40 }) === null, 'closed offered');
      S.shapes[0].closed = false;
      S.shapes[0].rot = 30;
      assert('resume: rotated path skipped', penResumeTarget({ x: 50, y: 40 }) === null, 'rotated offered');
      S.shapes[0].rot = 0;
      S.penPts = [makePt(5, 5, true)];
      assert('resume: not offered mid-draw', penResumeTarget({ x: 50, y: 40 }) === null, 'offered mid-draw');
      S.penPts = [];

      // render shows the resume cue (not the ghost) when hovering an endpoint
      S.cursorMM = { x: 50, y: 40 };
      const r = renderPenInProgress();
      assert('render: resume cue shown over an endpoint', /pen-resume-cue/.test(r) && !/pen-ghost/.test(r), 'cue/ghost wrong');

      // reversePenPts reverses order and swaps each anchor's in/out handles
      const rev = reversePenPts([makePt(0, 0, true), { x: 10, y: 0, cp1x: 8, cp1y: 0, cp2x: 12, cp2y: 0, corner: false }]);
      assert('reversePenPts: order reversed', rev[0].x === 10 && rev[1].x === 0, `${rev[0].x},${rev[1].x}`);
      assert('reversePenPts: cp1/cp2 swapped', rev[0].cp1x === 12 && rev[0].cp2x === 8, `${rev[0].cp1x},${rev[0].cp2x}`);

      // resumeOpenPath lifts the shape into the buffer; finish re-adds one shape keeping id + props
      resumeOpenPath(id, 'last');
      assert('resume: shape lifted out of the document', S.shapes.length === 0, `${S.shapes.length}`);
      assert('resume: points loaded into the buffer', S.penPts.length === 3, `${S.penPts.length}`);
      assert('resume: penResume captured', !!S.penResume && S.penResume.shape.id === id, 'no penResume');
      const histBefore = S.hist.length;
      S.penPts.push(makePt(0, 40, true)); // continue the path
      finishPen(false);
      assert('resume finish: one shape back', S.shapes.length === 1, `${S.shapes.length}`);
      const out = S.shapes[0];
      assert('resume finish: keeps the original id', out.id === id, `${out.id}`);
      assert('resume finish: keeps props (colour + stitch)', out.color === '#27ae60' && out.hasStitch === true, `${out.color},${out.hasStitch}`);
      assert('resume finish: grew to 4 points', out.points.length === 4, `${out.points.length}`);
      assert('resume finish: exactly one undo entry', S.hist.length === histBefore + 1, `${S.hist.length}`);
      undo();
      assert('resume finish: undo restores the 3-point open path',
        S.shapes.length === 1 && S.shapes[0].points.length === 3 && S.shapes[0].closed === false, `${S.shapes.length},${S.shapes[0].points.length}`);

      // resuming the FIRST endpoint reverses, so new points append after the old first anchor
      reset();
      S.tool = 'pen'; S.penPts = [];
      addShape({ type: 'path', points: [makePt(0, 0, true), makePt(50, 0, true)], closed: false });
      const id2 = S.shapes[0].id;
      resumeOpenPath(id2, 'first');
      assert('resume first: old first anchor is now last', S.penPts[S.penPts.length - 1].x === 0, `${S.penPts[S.penPts.length - 1].x}`);

      // cancelling a resume restores the lifted shape untouched
      cancelPen();
      assert('resume cancel: shape restored', S.shapes.length === 1 && S.shapes[0].id === id2, `${S.shapes.length}`);
      assert('resume cancel: penResume cleared', !S.penResume, 'still set');

      // ── drag-on-resume: clicking the endpoint then dragging sets ITS outgoing handle (additive) ──
      reset();
      S.tool = 'pen'; S.snap = false; S.penLastDown = 0; S.penPts = [];
      addShape({ type: 'path', points: [makePt(0, 0, true), makePt(50, 0, true), makePt(50, 40, true)], closed: false });
      S.cursorMM = { x: 50, y: 40 };
      penMouseDown({ x: 50, y: 40 }, false);           // resume the 'last' endpoint
      assert('resume drag: armed on endpoint', S.penResumeAnchor === true && S.penDown === true, `${S.penResumeAnchor},${S.penDown}`);
      const ep = S.penPts[S.penPts.length - 1];
      const c1x0 = ep.cp1x, c1y0 = ep.cp1y;
      penMouseMove({ x: 60, y: 50 }, false);           // drag away → sets the outgoing handle
      assert('resume drag: endpoint became smooth', ep.corner === false, 'still corner');
      assert('resume drag: outgoing handle follows the drag', ep.cp2x === 60 && ep.cp2y === 50, `${ep.cp2x},${ep.cp2y}`);
      assert('resume drag: incoming handle untouched (additive)', ep.cp1x === c1x0 && ep.cp1y === c1y0, 'cp1 moved');
      penMouseUp();
      assert('resume drag: flag cleared on release', S.penResumeAnchor === false, 'still armed');
      cancelPen(); // tidy up the lifted-path resume state so it can't leak into later features
    },

    // ── direct handle editing (Illustrator white-arrow): smooth preserves opposite, Alt breaks ──
    'path-handles'() {
      reset();
      const mk = (x, y, c1x, c1y, c2x, c2y, corner) =>
        ({ x, y, cp1x: c1x, cp1y: c1y, cp2x: c2x, cp2y: c2y, corner: !!corner });
      addShape({ type: 'path', closed: false, hasStitch: false, points: [
        mk(0, 0, 0, 0, 10, 0, false),    // anchor 0
        mk(20, 0, 10, 0, 30, 0, false),  // anchor 1: smooth, both handles length 10
        mk(40, 0, 30, 0, 40, 0, false),  // anchor 2
      ] });
      const sh = S.shapes[S.shapes.length - 1];
      S.selId = sh.id;
      const p = sh.points[1];

      // (a) smooth drag of cp2 straight up → cp1 rotates collinear, keeps its length (10)
      dragPathHandle('cp2-1', 20, 10, false);
      assert('smooth drag: dragged handle sits at cursor', p.cp2x === 20 && p.cp2y === 10, `${p.cp2x},${p.cp2y}`);
      const len1 = Math.hypot(p.cp1x - p.x, p.cp1y - p.y);
      assert('smooth drag: opposite handle length preserved (=10)', Math.abs(len1 - 10) < 1e-6, `${len1}`);
      const cross = (p.cp2x - p.x) * (p.cp1y - p.y) - (p.cp2y - p.y) * (p.cp1x - p.x);
      assert('smooth drag: handles stay collinear through anchor', Math.abs(cross) < 1e-6, `${cross}`);
      assert('smooth drag: opposite swings to the far side', (p.cp1y - p.y) < 0, `${p.cp1y}`);

      // (b) Alt-drag breaks the tangent → cusp (corner=true), opposite untouched
      const opp = { x: p.cp1x, y: p.cp1y };
      dragPathHandle('cp2-1', 30, 5, true);
      assert('alt-drag: marks the anchor a cusp (corner)', p.corner === true, `${p.corner}`);
      assert('alt-drag: dragged handle moved', p.cp2x === 30 && p.cp2y === 5, `${p.cp2x},${p.cp2y}`);
      assert('alt-drag: opposite handle untouched', p.cp1x === opp.x && p.cp1y === opp.y, `${p.cp1x},${p.cp1y}`);

      // (c) cusp keeps both extended handles grabbable
      const ids = getHandles(sh).map(h => h.id);
      assert('cusp: cp1 still exposed', ids.includes('cp1-1'), ids.join(','));
      assert('cusp: cp2 still exposed', ids.includes('cp2-1'), ids.join(','));

      // (d) plain drag on a cusp moves only that handle (opposite stays)
      const opp2 = { x: p.cp1x, y: p.cp1y };
      dragPathHandle('cp2-1', 35, 8, false);
      assert('cusp plain-drag: opposite stays put', p.cp1x === opp2.x && p.cp1y === opp2.y, `${p.cp1x},${p.cp1y}`);

      // (e) a truly collapsed corner exposes no control handles
      const c = sh.points[0];
      c.corner = true; c.cp1x = c.x; c.cp1y = c.y; c.cp2x = c.x; c.cp2y = c.y;
      const ids0 = getHandles(sh).map(h => h.id);
      assert('true corner: no cp handles', !ids0.includes('cp1-0') && !ids0.includes('cp2-0'), ids0.join(','));

      // (f) Shift snaps a control handle's angle to 45deg around its anchor, keeping its length
      const q = sh.points[2];                          // still smooth; cp1 extended at (30,0)
      dragPathHandle('cp1-2', 30, 3, false, true);     // raw (30,3) from anchor (40,0) → snaps onto the axis
      assert('shift: handle angle snapped onto an axis', Math.abs(q.cp1y - q.y) < 1e-9, `${q.cp1y}`);
      assert('shift: handle length preserved',
        Math.abs(Math.hypot(q.cp1x - q.x, q.cp1y - q.y) - Math.hypot(10, 3)) < 1e-6, `${q.cp1x}`);
    },

    // ── on-shape label: wraps long names + shrinks to fit ~80% of the box ──
    'label-fit'() {
      reset();
      S.labelMM = 5;
      const fsOf = h => parseFloat((h.match(/font-size="([\d.]+)"/) || [])[1]);
      const nameLines = h => (h.match(/class="sh-label" /g) || []).length; // dim line is "sh-label sh-label-dim"
      // long name, small box → wraps to several lines and shrinks below labelMM
      const small = { type: 'rect', x: 0, y: 0, w: 30, h: 20, showLabel: true, label: 'Front Panel Lining Piece A' };
      const h = shapeLabel(small);
      assert('label wraps long name (≥2 name lines)', nameLines(h) >= 2, `lines=${nameLines(h)}`);
      assert('label shrinks to fit small box', fsOf(h) < S.labelMM && fsOf(h) > 0, `fs=${fsOf(h)}`);
      // big box, short name → stays one line at the configured size
      const big = { type: 'rect', x: 0, y: 0, w: 200, h: 120, showLabel: true, label: 'Tab' };
      const h2 = shapeLabel(big);
      assert('short name stays one line', nameLines(h2) === 1, `lines=${nameLines(h2)}`);
      assertNear('label keeps configured size when it fits', fsOf(h2), S.labelMM, 0.01);
    },

    // ── multi-select: selIds source of truth, band hit, group delete, group move ──
    'multiselect'() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      addShape({ type: 'rect', x: 50, y: 0, w: 10, h: 10 });
      addShape({ type: 'rect', x: 200, y: 200, w: 10, h: 10 });
      const [a, b, c] = S.shapes.map(s => s.id);
      // selId is a derived primary; setting it collapses to a single selection
      S.selId = a;
      assert('selId set → selIds=[id]', S.selIds.length === 1 && S.selIds[0] === a, S.selIds.join(','));
      // rubber-band selects intersecting shapes only
      const hit = shapesInBand(-5, -5, 65, 15);
      assert('band selects intersecting shapes (not far ones)', hit.includes(a) && hit.includes(b) && !hit.includes(c), hit.join(','));
      // multi selection → selId = primary (last)
      S.selIds = [a, b];
      assert('selId = primary (last of selIds)', S.selId === b, `${S.selId}`);
      // properties panel shows a multi-select summary instead of the single-shape editor
      updatePropsPanel();
      assert('multi-sel: summary shown, single-shape props hidden',
        document.getElementById('multi-sel-msg').style.display !== 'none' &&
        document.getElementById('sel-props').style.display === 'none', 'panel state wrong');
      assert('multi-sel: count reflects the selection',
        /2 shapes selected/.test(document.getElementById('multi-sel-count').textContent),
        document.getElementById('multi-sel-count').textContent);
      // group delete removes every selected shape
      deleteSelected();
      assert('group delete removes all selected', S.shapes.length === 1 && S.shapes[0].id === c, S.shapes.map(s => s.id).join(','));
      // placeShape translates from a snapshot (group-move primitive)
      const snap = JSON.parse(JSON.stringify(S.shapes[0]));
      placeShape(S.shapes[0], snap, 5, 7);
      assert('placeShape translates from snapshot', S.shapes[0].x === snap.x + 5 && S.shapes[0].y === snap.y + 7, `${S.shapes[0].x},${S.shapes[0].y}`);
    },

    // ── duplicate: Ctrl+D clones selection, offsets, selects copies, one undo ──
    'duplicate'() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10, color: '#ff0000', rot: 30 });
      addShape({ type: 'circle', cx: 50, cy: 5, r: 5 });
      const [a, b] = S.shapes.map(s => s.id);
      const histBefore = S.hist.length;

      // single-shape duplicate
      S.selId = a;
      duplicateSelected();
      assert('one copy added', S.shapes.length === 3, `${S.shapes.length}`);
      const dup = S.shapes[S.shapes.length - 1];
      assert('copy has a fresh id', dup.id !== a && dup.id !== b, `${dup.id}`);
      assert('copy offset down-right by DUP_OFFSET', dup.x === 0 + DUP_OFFSET && dup.y === 0 + DUP_OFFSET, `${dup.x},${dup.y}`);
      assert('copy preserves props (colour, rotation)', dup.color === '#ff0000' && dup.rot === 30, `${dup.color},${dup.rot}`);
      assert('copy is a deep clone (own object)', dup !== S.shapes[0], 'same ref');
      assert('selection moves to the copy', S.selIds.length === 1 && S.selId === dup.id, S.selIds.join(','));
      assert('exactly one undo entry pushed', S.hist.length === histBefore + 1, `${S.hist.length}`);

      // undo removes the copy cleanly
      undo();
      assert('undo removes the copy', S.shapes.length === 2, `${S.shapes.length}`);

      // multi-select duplicate clones every selected shape, keeps relative z-order
      S.selIds = [a, b];
      duplicateSelected();
      assert('multi-dup adds one copy per selected', S.shapes.length === 4, `${S.shapes.length}`);
      assert('both copies selected', S.selIds.length === 2, S.selIds.join(','));
      const types = S.shapes.slice(2).map(s => s.type);
      assert('copies keep relative order (rect then circle)', types[0] === 'rect' && types[1] === 'circle', types.join(','));

      // empty selection is a no-op
      S.selIds = [];
      const n = S.shapes.length, h = S.hist.length;
      duplicateSelected();
      assert('no selection → no-op (no shape, no undo)', S.shapes.length === n && S.hist.length === h, `${S.shapes.length},${S.hist.length}`);

      // ── Alt-drag duplicate-and-move: clone in place, drag the copies, one undo entry ──
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      const orig = S.shapes[0].id;
      S.selIds = [orig];
      const h0 = S.hist.length;
      const clone = altDuplicateInPlace(orig);          // mousedown-with-alt: copy sits on the original
      assert('alt-dup: copy created in place', S.shapes.length === 2 && S.shapes[1].x === 0 && S.shapes[1].y === 0, `${S.shapes.length}`);
      assert('alt-dup: selection is the copy', S.selId === clone && clone !== orig, `${S.selId},${clone}`);
      assert('alt-dup: history deferred to release', S.hist.length === h0, `${S.hist.length}`);
      nudgeShape(getShape(clone), 20, 0);               // drag the copy
      finishAltDuplicate(true);                          // release
      assert('alt-dup commit: copy moved, original stayed', getShape(clone).x === 20 && getShape(orig).x === 0, `${getShape(clone).x},${getShape(orig).x}`);
      assert('alt-dup commit: one undo entry', S.hist.length === h0 + 1, `${S.hist.length}`);
      undo();
      assert('alt-dup undo: copy removed, original restored', S.shapes.length === 1 && S.shapes[0].id === orig, `${S.shapes.length}`);

      // pure alt-click (no drag) is a no-op: copies dropped, originals reselected, no history
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      const o2 = S.shapes[0].id;
      S.selIds = [o2];
      const h1 = S.hist.length;
      altDuplicateInPlace(o2);
      finishAltDuplicate(false);
      assert('alt-click no-drag: copies removed', S.shapes.length === 1, `${S.shapes.length}`);
      assert('alt-click no-drag: original reselected', S.selIds.length === 1 && S.selId === o2, S.selIds.join(','));
      assert('alt-click no-drag: no history', S.hist.length === h1, `${S.hist.length}`);

      // multi-select alt-dup clones every selected shape, keeps them all selected
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      addShape({ type: 'circle', cx: 40, cy: 5, r: 5 });
      const [m1, m2] = S.shapes.map(s => s.id);
      S.selIds = [m1, m2];
      altDuplicateInPlace(m2);
      assert('alt-dup multi: one copy per selected', S.shapes.length === 4, `${S.shapes.length}`);
      assert('alt-dup multi: copies (not originals) selected', S.selIds.length === 2 && S.selIds.every(id => id !== m1 && id !== m2), S.selIds.join(','));
      finishAltDuplicate(true);
    },

    // ── stitch panel I/O: margin = free numeric, spacing = iron-size dropdown (+ custom) ──
    'stitch-inputs'() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 50, h: 50, hasStitch: true, stitchMargin: 3, stitchSpacing: 3.38 });
      S.selId = S.shapes[0].id;
      updatePropsPanel(); // populate panel inputs from the shape
      const sh = S.shapes[0];
      // margin is a plain numeric input
      document.getElementById('pi-margin').value = '4.2';
      document.getElementById('pi-spacing').value = '2.7'; // an iron-size preset
      applyProps();
      assertNear('margin reads the numeric input', sh.stitchMargin, 4.2, 1e-9);
      assertNear('spacing reads the iron-size dropdown', sh.stitchSpacing, 2.7, 1e-9);
      // custom spacing path
      document.getElementById('pi-spacing').value = 'custom';
      document.getElementById('pi-spacing-custom').value = '5';
      applyProps();
      assertNear('spacing custom option reads the custom field', sh.stitchSpacing, 5, 1e-9);
      // a non-preset spacing repopulates as "custom"
      sh.stitchSpacing = 4.13; updatePropsPanel();
      assert('non-preset spacing shows as custom', document.getElementById('pi-spacing').value === 'custom', document.getElementById('pi-spacing').value);

      // ── Settings default-spacing uses the SAME iron-size dropdown (presets + custom) ──
      S.defSpacing = 3.85; openSettings();
      assert('settings: preset default selects the dropdown', document.getElementById('set-spacing').value === '3.85', document.getElementById('set-spacing').value);
      assert('settings: preset hides the custom row', document.getElementById('set-spacing-custom-row').style.display === 'none', 'custom row shown');
      document.getElementById('set-spacing').value = '2.7'; onSettingsSpacingChange(); saveSettings();
      assertNear('settings: dropdown writes defSpacing', S.defSpacing, 2.7, 1e-9);
      S.defSpacing = 4.4; openSettings();
      assert('settings: non-preset default shows as custom', document.getElementById('set-spacing').value === 'custom', document.getElementById('set-spacing').value);
      assert('settings: custom row visible for a non-preset', document.getElementById('set-spacing-custom-row').style.display !== 'none', 'custom row hidden');
      document.getElementById('set-spacing-custom').value = '6.1'; saveSettings();
      assertNear('settings: custom field writes defSpacing', S.defSpacing, 6.1, 1e-9);
    },

    // ── layers: reorder = array order, per-shape opacity (default 1), survives round-trip ──
    layers() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });   // bottom (array[0])
      addShape({ type: 'circle', cx: 50, cy: 5, r: 5 });      // top    (array[last])
      const [bottom, top] = S.shapes.map(s => s.id);
      // opacity defaults to absent → rendered as 1
      assert('layers: opacity absent by default', S.shapes[0].opacity === undefined, `op=${S.shapes[0].opacity}`);
      // raiseLayer moves a shape later in the array (toward the front)
      raiseLayer(bottom);
      assert('raiseLayer moves shape forward (later in array)', S.shapes[1].id === bottom, S.shapes.map(s => s.id).join(','));
      lowerLayer(bottom);
      assert('lowerLayer moves it back', S.shapes[0].id === bottom && S.shapes[1].id === top, S.shapes.map(s => s.id).join(','));
      // raise at the top / lower at the bottom are no-ops (and push no history)
      const histBefore = S.hist.length;
      raiseLayer(top); lowerLayer(bottom);
      assert('reorder at the boundary is a no-op (no history)', S.hist.length === histBefore, `hist ${S.hist.length} vs ${histBefore}`);
      // reorder pushes one undo entry and is reversible
      const orderBefore = S.shapes.map(s => s.id).join(',');
      raiseLayer(bottom);
      assert('reorder pushes history', S.hist.length === histBefore + 1, `hist=${S.hist.length}`);
      undo();
      assert('reorder is undoable', S.shapes.map(s => s.id).join(',') === orderBefore, S.shapes.map(s => s.id).join(','));
      // opacity is a plain shape field → rides through save/load
      S.shapes[0].opacity = 0.4;
      const wire = JSON.parse(JSON.stringify(buildSaveData()));
      applyLoadedData(wire);
      assertNear('layers: opacity survives round-trip', S.shapes[0].opacity, 0.4, 1e-9);

      // opacity drives FILL solidity: 0 → FILL_MIN (outline-only look), 1 → fully opaque.
      assertNear('fillOpacityOf: absent opacity → outline (FILL_MIN)', fillOpacityOf({}), FILL_MIN, 1e-9);
      assertNear('fillOpacityOf: opacity 1 → fully opaque', fillOpacityOf({ opacity: 1 }), 1, 1e-9);

      // live opacity-slider path: writes the shape AND its live fill-opacity (no list rebuild),
      // commits one history entry on release, and — crucially — leaves the panel able to keep
      // updating afterwards (regression: a stuck render-gate once froze the swatches to default).
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      const lid = S.shapes[0].id;
      const histBefore2 = S.hist.length;
      opDragStart();
      setLayerOpacity(lid, 30);
      assertNear('setLayerOpacity writes sh.opacity', S.shapes[0].opacity, 0.3, 1e-9);
      const fill = document.querySelector('#shg-' + lid + ' .sh-fill');
      assertNear('setLayerOpacity updates the live fill-opacity', fill ? parseFloat(fill.style.fillOpacity) : -1, fillOpacityOf({ opacity: 0.3 }), 1e-6);
      opDragEnd();
      assert('opacity edit commits one history entry', S.hist.length === histBefore2 + 1, `hist ${S.hist.length} vs ${histBefore2}`);
      setShapeColor('#e84393'); // colour the shape via the real picker path
      const sw = (document.getElementById('layers-list').innerHTML.split('lay-sw" style="background:')[1] || '').split('"')[0];
      assert('layer swatch tracks shape colour after an opacity edit (panel not frozen)', sw.toLowerCase() === '#e84393', `swatch=${sw}`);

      // drag-to-reorder: reorderLayerTo moves a layer to a new slot in visual order
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });   // bottom (array[0])
      addShape({ type: 'circle', cx: 50, cy: 5, r: 5 });      // top    (array[last])
      const [bot2, top2] = S.shapes.map(s => s.id);
      const beforeOrder = S.shapes.map(s => s.id).join(',');
      reorderLayerTo(bot2, top2, false); // drop bottom layer ABOVE the top one → bottom moves to front
      assert('drag-reorder moves a layer to the front', S.shapes[S.shapes.length - 1].id === bot2 && S.shapes.map(s => s.id).join(',') !== beforeOrder, S.shapes.map(s => s.id).join(','));
      const hh = S.hist.length;
      reorderLayerTo(bot2, bot2, false); // onto itself → no-op, no history
      assert('drag-reorder onto self is a no-op (no history)', S.hist.length === hh, `hist ${S.hist.length} vs ${hh}`);

      // ── Per-layer hide / lock (v0.7.5) ──
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 20 });
      const hl = S.shapes[0].id;
      assert('hide/lock: shape hittable by default', hitShape(10, 10) === hl, `${hitShape(10, 10)}`);
      // hide → not rendered, not hit-testable, not marquee-selected, not a snap target
      toggleLayerHidden(hl);
      assert('hide: flag set', S.shapes[0].hidden === true, `${S.shapes[0].hidden}`);
      assert('hide: not rendered', document.getElementById('shg-' + hl) === null, 'still in DOM');
      assert('hide: not hit-testable', hitShape(10, 10) === null, `${hitShape(10, 10)}`);
      assert('hide: not marquee-selected', !shapesInBand(-5, -5, 30, 30).includes(hl), 'in band');
      toggleLayerHidden(hl); // show again
      assert('show: rendered again', document.getElementById('shg-' + hl) !== null, 'missing from DOM');
      // lock → still rendered (visible) but not selectable on canvas / marquee
      toggleLayerLocked(hl);
      assert('lock: flag set', S.shapes[0].locked === true, `${S.shapes[0].locked}`);
      assert('lock: still rendered (visible)', document.getElementById('shg-' + hl) !== null, 'missing from DOM');
      assert('lock: not hit-testable', hitShape(10, 10) === null, `${hitShape(10, 10)}`);
      assert('lock: not marquee-selected', !shapesInBand(-5, -5, 30, 30).includes(hl), 'in band');
      selectLayer(hl);
      assert('lock: locked layer cannot be selected via panel', !S.selIds.includes(hl), 'selected');
      toggleLayerLocked(hl); // unlock
      // hiding a selected shape deselects it (no stale handles on an invisible shape)
      S.selIds = [hl];
      toggleLayerHidden(hl);
      assert('hide: hiding a selected shape deselects it', !S.selIds.includes(hl), 'still selected');
      toggleLayerHidden(hl);
      // flags ride through save/load (v14) and normShape backfills old files to false
      S.shapes[0].hidden = true; S.shapes[0].locked = true;
      const wire2 = JSON.parse(JSON.stringify(buildSaveData()));
      assert('hide/lock: save format is v15', wire2.version === 15, `v${wire2.version}`);
      applyLoadedData(wire2);
      assert('hide/lock: flags survive round-trip', S.shapes[0].hidden === true && S.shapes[0].locked === true, `${S.shapes[0].hidden},${S.shapes[0].locked}`);
      const nb = normShape({ type: 'rect', x: 0, y: 0, w: 5, h: 5 });
      assert('normShape backfills missing flags to false', nb.hidden === false && nb.locked === false, `${nb.hidden},${nb.locked}`);
    },

    // ── Layers panel grouping under artboards (v0.7.2) ──
    'layer-groups'() {
      reset();
      // two 100mm artboards side by side; a shape centred in each + one far away (unplaced)
      S.artboards = [{ id: 1, name: 'A', preset: 'A4', orient: 'portrait', w: 100, h: 100, x: 0, y: 0 },
                     { id: 2, name: 'B', preset: 'A4', orient: 'portrait', w: 100, h: 100, x: 200, y: 0 }];
      S.activeArtboard = 1; S.nextArtboardId = 3;
      addShape({ type: 'rect', x: 10, y: 10, w: 20, h: 20 });      // centre (20,20) → artboard 1
      addShape({ type: 'rect', x: 210, y: 10, w: 20, h: 20 });     // centre (220,20) → artboard 2
      addShape({ type: 'rect', x: -100, y: -100, w: 20, h: 20 });  // centre (-90,-90) → unplaced
      const s1 = S.shapes[0], s2 = S.shapes[1], s3 = S.shapes[2];
      assert('layer-groups: shape maps to its artboard', shapeArtboardId(s1) === 1 && shapeArtboardId(s2) === 2, `${shapeArtboardId(s1)},${shapeArtboardId(s2)}`);
      assert('layer-groups: off-artboard shape is unplaced', shapeArtboardId(s3) === null, `${shapeArtboardId(s3)}`);
      renderLayers();
      assert('layer-groups: a header per non-empty group', document.querySelectorAll('#layers-list .lay-group').length === 3, `${document.querySelectorAll('#layers-list .lay-group').length}`);
      assert('layer-groups: every shape gets a row', document.querySelectorAll('#layers-list .lay-row').length === 3, `${document.querySelectorAll('#layers-list .lay-row').length}`);
      toggleLayerGroup('1');
      assert('layer-groups: collapse hides member rows', document.querySelectorAll('#layers-list .lay-row').length === 2, `${document.querySelectorAll('#layers-list .lay-row').length}`);
      toggleLayerGroup('1');
      // group-aware reorder: a 2nd shape on artboard 1; raising the back one swaps within the group
      addShape({ type: 'rect', x: 40, y: 40, w: 10, h: 10 });      // centre (45,45) → artboard 1
      raiseLayer(s1.id);
      assert('layer-groups: raise swaps within group (skips other artboards)', S.shapes[3].id === s1.id, `order=${S.shapes.map(s => s.id).join(',')}`);
      // single artboard holding everything → flat list, no header
      reset();
      addShape({ type: 'rect', x: 10, y: 10, w: 20, h: 20 });
      renderLayers();
      assert('layer-groups: single section renders flat (no header)', document.querySelectorAll('#layers-list .lay-group').length === 0, 'unexpected header');
      reset();
    },

    // ── text box (v0.5): wrap-bounded label box, mm font fixed under box resize ──
    text() {
      reset();
      const t = makeTextShape(10, 10, 60, 20);
      t.text = 'Hello world from the text box tool';
      addShape(t);
      const sh = S.shapes[S.shapes.length - 1];
      assert('text: shape added with type text', sh.type === 'text', sh.type);
      assert('text: default font size set', sh.fontSize === TEXT_DEFAULT_FONT, `${sh.fontSize}`);
      assert('text: defaults (not bold/italic/outline)', !sh.bold && !sh.italic && !sh.outline, 'flags');
      assert('text: defaults (align left/top, fill on)', sh.align === 'left' && sh.valign === 'top' && sh.fill === true, `align=${sh.align} valign=${sh.valign} fill=${sh.fill}`);

      // hit-test: inside the box selects it, outside misses (empty fill still grabbable in-bounds)
      assert('text: hitShape inside the box', hitShape(11, 11) === sh.id, `got ${hitShape(11, 11)}`);
      assert('text: hitShape outside the box misses', hitShape(300, 300) === null, `got ${hitShape(300, 300)}`);

      // 8 box resize handles (like a rect)
      const ids = getHandles(sh).map(h => h.id).sort().join(',');
      assert('text: 8 box handles', ids === 'e,n,ne,nw,s,se,sw,w', ids);

      // wrap responds to box width while the (mm) font size stays fixed
      const wide = wrapTextLines({ ...sh, w: 400 });
      const narrow = wrapTextLines({ ...sh, w: 24 });
      assert('text: short content fits one line in a wide box', wide.length === 1, `lines=${wide.length}`);
      assert('text: wraps to more lines in a narrow box', narrow.length > wide.length, `narrow=${narrow.length} wide=${wide.length}`);

      // explicit newlines are honoured
      const nl = wrapTextLines({ ...sh, text: 'a\nb\nc', w: 400 });
      assert('text: explicit newlines split lines', nl.length === 3, `lines=${nl.length}`);

      // resizing the box only changes w/h — the font size is never touched
      const fontBefore = sh.fontSize;
      sh.w = 30; sh.h = 12; // simulate the result of a resize drag
      assert('text: resize keeps font size', sh.fontSize === fontBefore, `${sh.fontSize}`);

      // render emits the glyph text + a screen-only frame
      renderContent();
      assert('text: render emits a glyph element', /class="txt-glyph"/.test(vp.innerHTML), 'no txt-glyph');
      assert('text: render emits the box frame', /class="text-box-frame"/.test(vp.innerHTML), 'no frame');

      // alignment sets the text-anchor; right-align anchors at end
      sh.align = 'right'; renderContent();
      assert('text: right align → text-anchor end', /text-anchor="end"/.test(vp.innerHTML), 'no end anchor');
      sh.align = 'center'; renderContent();
      assert('text: center align → text-anchor middle', /text-anchor="middle"/.test(vp.innerHTML), 'no middle anchor');
      sh.align = 'left';

      // vertical alignment shifts the wrapped block's first baseline (top < middle < bottom)
      const firstY = () => { const m = vp.innerHTML.match(/class="txt-glyph[^"]*"[^>]*\by="([\d.]+)"/); return m ? parseFloat(m[1]) : NaN; };
      sh.text = 'line one\nline two\nline three'; sh.w = 80; sh.h = 60;
      sh.valign = 'top'; renderContent(); const yTop = firstY();
      sh.valign = 'middle'; renderContent(); const yMid = firstY();
      sh.valign = 'bottom'; renderContent(); const yBot = firstY();
      assert('text: vertical align shifts block (top<middle<bottom)', yTop < yMid && yMid < yBot, `${yTop},${yMid},${yBot}`);
      sh.valign = 'top'; sh.text = 'Hello world from the text box tool';

      // fill off → glyphs render hollow (fill="none" + txt-hollow class for the print rule)
      sh.fill = false; renderContent();
      assert('text: fill off → hollow glyph (fill none)', /class="txt-glyph txt-hollow"[^>]*fill="none"/.test(vp.innerHTML), 'not hollow');
      sh.fill = true; renderContent();
      assert('text: fill on → solid glyph (no hollow class)', !/txt-hollow/.test(vp.innerHTML), 'still hollow');

      // layer name follows the content (first line, ≤40 chars)
      assert('text: layer name from content', layerName(sh) === 'Hello world from the text box tool', layerName(sh));

      // style fields survive a save/load round-trip (v12)
      sh.bold = true; sh.italic = true; sh.outline = true; sh.outlineColor = '#ffffff'; sh.outlineWidth = 0.5; sh.color = '#e84393';
      sh.align = 'right'; sh.valign = 'bottom'; sh.fill = false; sh.autoGrow = true;
      const wire = JSON.parse(JSON.stringify(buildSaveData()));
      assert('text: save version is 15', wire.version === 15, `version=${wire.version}`);
      applyLoadedData(wire);
      const r = S.shapes[S.shapes.length - 1];
      assert('text: content survives round-trip', r.text === 'Hello world from the text box tool', r.text);
      assert('text: style flags survive round-trip', r.bold && r.italic && r.outline, `b=${r.bold} i=${r.italic} o=${r.outline}`);
      assert('text: outline + colour survive round-trip',
        r.outlineColor === '#ffffff' && r.outlineWidth === 0.5 && r.color === '#e84393', `${r.outlineColor},${r.outlineWidth},${r.color}`);
      assert('text: align + valign + fill survive round-trip', r.align === 'right' && r.valign === 'bottom' && r.fill === false, `align=${r.align} valign=${r.valign} fill=${r.fill}`);
      assert('text: autoGrow survives round-trip', r.autoGrow === true, `autoGrow=${r.autoGrow}`);

      // ── per-run inline emphasis (v0.7.22): **bold** / *italic* → styled <tspan> runs ──
      r.bold = false; r.italic = false; r.fill = true; r.autoGrow = false; r.align = 'left'; r.w = 400;
      r.text = 'plain **bold** word'; renderContent();
      let html = vp.innerHTML;
      assert('text: **markup** → a 700-weight tspan', /<tspan[^>]*font-weight="700"[^>]*>bold\s*<\/tspan>/.test(html), 'no bold run');
      assert('text: surrounding text stays 400', /<tspan[^>]*font-weight="400"[^>]*>plain /.test(html), 'no plain run');
      const runText = (html.match(/<tspan[^>]*>([^<]*)<\/tspan>/g) || []).join('');
      assert('text: markers stripped from rendered runs', !runText.includes('*'), runText);
      r.text = 'one *two* three *four* five';
      assert('text: styled + plain wraps agree on line count', wrapStyledLines(r).length === wrapTextLines(r).length, `${wrapStyledLines(r).length} vs ${wrapTextLines(r).length}`);
      r.italic = true; r.text = 'hi'; renderContent();
      assert('text: baseline italic → italic tspan', /<tspan[^>]*font-style="italic"[^>]*>hi<\/tspan>/.test(vp.innerHTML), 'no italic run');
      r.italic = false;

      // ── auto-height (v0.7.22): box height follows wrapped content; vertical handles drop out ──
      r.autoGrow = true; r.w = 40; r.h = 200; r.text = 'line one\nline two\nline three';
      reflowTextHeight(r);
      const apad = Math.min(r.fontSize * 0.25, r.w * 0.12);
      const expectH = wrapTextLines(r, apad).length * (r.fontSize * 1.25) + 2 * apad;
      assert('text: auto-height fits content', Math.abs(r.h - expectH) < 1e-6, `h=${r.h} exp=${expectH}`);
      const tallH = r.h; r.text = 'one'; reflowTextHeight(r);
      assert('text: auto-height shrinks with less text', r.h < tallH, `${r.h} !< ${tallH}`);
      const agHandles = getHandles(r).map(h => h.id).sort().join(',');
      assert('text: auto-height drops n/s handles', agHandles === 'e,ne,nw,se,sw,w', agHandles);
      r.autoGrow = false;

      // normText backfills a bare/partial text shape (forward-compat on load)
      const bare = normText({ type: 'text', x: 0, y: 0, w: 0, h: 0 });
      assert('text: normText backfills defaults',
        bare.fontSize === TEXT_DEFAULT_FONT && bare.w === TEXT_DEFAULT_W && bare.text === '' && bare.outlineColor === '#000000'
        && bare.align === 'left' && bare.valign === 'top' && bare.fill === true && bare.autoGrow === false, JSON.stringify(bare));
    },

    // ── home / welcome screen (v0.6): overlay, french-stitch border, themed dialog, recovery ──
    home() {
      const el = document.getElementById('home');
      assert('home: overlay element exists', !!el, 'no #home');
      showHome();
      assert('home: showHome reveals it', !el.classList.contains('home-hidden'), el.className);
      assert('home: stitch border drawn (many slits)', document.querySelectorAll('#home-stitch rect').length > 20, `${document.querySelectorAll('#home-stitch rect').length}`);
      assert('home: New + Open buttons present', /New File/.test(el.innerHTML) && /Open File/.test(el.innerHTML), 'buttons missing');
      assert('home: toolbar Home button present', !!document.getElementById('tb-home'), 'no #tb-home');
      // "Back to your work" escape: hidden at launch (showHome()), shown on a mid-session open (showHome(true))
      const back = document.getElementById('home-back');
      assert('home: back-to-work escape exists', !!back, 'no #home-back');
      assert('home: back escape hidden on launch open', back.style.display === 'none', back.style.display);
      showHome(true);
      assert('home: back escape shown on manual open', back.style.display !== 'none', back.style.display);
      hideHome();
      assert('home: hideHome hides it', el.classList.contains('home-hidden'), el.className);

      // themed confirm dialog: opens, carries its message/labels, draws its own stitch border, closes
      const p = confirmModal('Discard this?', { ok: 'Discard', cancel: 'Keep', title: 'Heads up' });
      p.catch(() => {}); // we don't await the result here (microtasks don't run mid-feature)
      assert('confirm: dialog opens', isConfirmOpen(), 'not open');
      assert('confirm: message + button labels set',
        document.getElementById('confirm-msg').textContent === 'Discard this?' &&
        document.getElementById('confirm-ok').textContent === 'Discard' &&
        document.getElementById('confirm-cancel').textContent === 'Keep', 'labels wrong');
      assert('confirm: own french-stitch border drawn', document.querySelectorAll('#confirm-stitch rect').length > 8, `${document.querySelectorAll('#confirm-stitch rect').length}`);
      closeConfirm(true);
      assert('confirm: closes on action', !isConfirmOpen(), 'still open');
      // alertModal hides the cancel button (single-action notice)
      alertModal('FYI');
      assert('alert: cancel button hidden', document.getElementById('confirm-cancel').style.display === 'none', 'cancel visible');
      closeConfirm(false);

      // auto-save recovery is offered on the welcome screen (no launch prompt) and applies in-app
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      const snap = buildSaveData(); snap.meta.autosaved = new Date().toISOString();
      S._launchRecovery = { ts: new Date(), count: 1, data: snap };
      showHome();
      assert('home: recovery card shows when recoverable', /Recover auto-saved/.test(document.getElementById('home-recovery').innerHTML), 'no recovery card');
      reset(); // wipe the live doc; recover should bring the snapshot back
      recoverAutoSave();
      assert('home: recoverAutoSave restores the session', S.shapes.length === 1, `count=${S.shapes.length}`);
      assert('home: recoverAutoSave closes the screen', el.classList.contains('home-hidden'), el.className);
      assert('home: launch recovery cleared after use', S._launchRecovery == null, `${S._launchRecovery}`);

      // relTime formatting
      assert('home: relTime seconds', relTime(Date.now() - 5000) === '5s ago', relTime(Date.now() - 5000));
      assert('home: relTime minutes', relTime(Date.now() - 120000) === '2m ago', relTime(Date.now() - 120000));
      assert('home: relTime hours', relTime(Date.now() - 3 * 3600000) === '3h ago', relTime(Date.now() - 3 * 3600000));
      // no recents → list renders empty (no crash without File System Access handles)
      S._homeRecents = [];
      assert('home: empty recents render to nothing', !/home-recent"/.test(document.getElementById('home-recents').innerHTML), 'unexpected recents');
    },

    // ── in-app help overlay (? key) ──
    help() {
      const el = document.getElementById('help-bg');
      assert('help: overlay element exists', !!el, 'no #help-bg');
      assert('help: toolbar ? button present', !!document.getElementById('tb-help'), 'no #tb-help');
      assert('help: closed by default', !isHelpOpen(), el.className);
      openHelp();
      assert('help: openHelp opens it', isHelpOpen(), el.className);
      assert('help: content has section headings', document.querySelectorAll('#help-bg .help-sec-h').length >= 6,
        `${document.querySelectorAll('#help-bg .help-sec-h').length}`);
      assert('help: covers Pen + Stitching topics', /Pen/.test(el.innerHTML) && /Stitch/.test(el.innerHTML), 'topics missing');
      closeHelp();
      assert('help: closeHelp closes it', !isHelpOpen(), el.className);
    },

    // Launch update-check gate (the visible "Checking for updates…" splash). The live updater is
    // desktop-only; here we verify the splash element + show/hide helpers + that launchUpdateCheck is
    // a safe no-op in a plain browser (no window.__TAURI__.updater).
    updatecheck() {
      const sp = document.getElementById('upd-splash');
      assert('update: splash element exists', !!sp, 'no #upd-splash');
      assert('update: splash hidden by default', !sp.classList.contains('open'), sp.className);
      assert('update: spinner present', !!sp.querySelector('.upd-spinner'), 'no .upd-spinner');
      showUpdSplash();
      assert('update: showUpdSplash opens it', sp.classList.contains('open'));
      hideUpdSplash();
      assert('update: hideUpdSplash closes it', !sp.classList.contains('open'));
      let threw = false;
      try { launchUpdateCheck(); } catch (e) { threw = true; }
      assert('update: launchUpdateCheck no-op in browser (no throw)', !threw);
      assert('update: launchUpdateCheck leaves splash closed in browser', !sp.classList.contains('open'));
    },

    // ── Quick Start (FTUE) overlay, opened from the welcome screen ──
    quickstart() {
      const el = document.getElementById('qs-bg');
      assert('quickstart: overlay element exists', !!el, 'no #qs-bg');
      assert('quickstart: home has a first-time entry', !!document.querySelector('#home .home-firsttime'), 'no first-time link');
      assert('quickstart: closed by default', !isQuickStartOpen(), el.className);
      openQuickStart();
      assert('quickstart: openQuickStart opens it', isQuickStartOpen(), el.className);
      assert('quickstart: four numbered steps', document.querySelectorAll('#qs-bg .qs-step').length === 4,
        `${document.querySelectorAll('#qs-bg .qs-step').length}`);
      assert('quickstart: covers draw → stitch → print', /Draw a piece/.test(el.innerHTML) && /stitching/i.test(el.innerHTML) && /Print at true scale/.test(el.innerHTML), 'steps missing');
      // "Open full Help →" hands off to the full reference
      quickStartToHelp();
      assert('quickstart: handoff closes quick-start, opens Help', !isQuickStartOpen() && isHelpOpen(), `${el.className}`);
      closeHelp();
      openQuickStart();
      closeQuickStart();
      assert('quickstart: closeQuickStart closes it', !isQuickStartOpen(), el.className);
    },

    // ── multiple artboards (v0.7): data model, add/select/delete, migration, save v13 round-trip ──
    artboards() {
      reset();
      assert('artboards: one default artboard', S.artboards.length === 1, `n=${S.artboards.length}`);
      assert('artboards: S.page getter = active artboard', S.page === S.artboards[0], 'getter mismatch');
      assert('artboards: default at origin', S.artboards[0].x === 0 && S.artboards[0].y === 0, `${S.artboards[0].x},${S.artboards[0].y}`);

      // add → second artboard, becomes active, placed to the right (no overlap), tool switches
      addArtboard();
      assert('artboards: add → two artboards', S.artboards.length === 2, `n=${S.artboards.length}`);
      const ab2 = S.artboards[1];
      assert('artboards: new one is active', S.activeArtboard === ab2.id, `active=${S.activeArtboard}`);
      assert('artboards: placed right of the first (gap)', ab2.x >= S.artboards[0].w, `x=${ab2.x}`);
      assert('artboards: Artboard tool engaged', S.tool === 'artboard', `tool=${S.tool}`);

      // hit-test + select
      assert('artboards: hitArtboard finds the second', hitArtboard(ab2.x + 5, ab2.y + 5) === ab2.id, 'miss');
      assert('artboards: hitArtboard misses empty space', hitArtboard(-50, -50) === null, 'false hit');
      selectArtboard(S.artboards[0].id);
      assert('artboards: selectArtboard switches active', S.activeArtboard === S.artboards[0].id, `active=${S.activeArtboard}`);

      // save v13 round-trips the full list + active id
      const ab2id = ab2.id;
      const saved = buildSaveData();
      assert('artboards: save carries the list', saved.artboards.length === 2 && saved.activeArtboard === S.activeArtboard, JSON.stringify(saved.activeArtboard));
      const wire = JSON.parse(JSON.stringify(saved));
      applyLoadedData(wire);
      assert('artboards: round-trip restores both', S.artboards.length === 2, `n=${S.artboards.length}`);
      assert('artboards: round-trip keeps active', S.activeArtboard === S.artboards[0].id, `active=${S.activeArtboard}`);

      // ── multi-page print/export (v0.7 follow-up) ──
      S.pan = { x: 0, y: 0 }; S.zoom = 1; renderContent();
      const { root, pageCSS } = buildPrintPages();
      assert('print: one page per artboard', root.querySelectorAll('.print-page').length === S.artboards.length, `${root.querySelectorAll('.print-page').length}`);
      assert('print: named @page per artboard', (pageCSS.match(/@page abp/g) || []).length === S.artboards.length, pageCSS);
      const ab0 = S.artboards[0], svg0 = root.querySelector('.print-page svg');
      assert('print: page box sized in mm', svg0.getAttribute('width') === `${ab0.w}mm` && svg0.getAttribute('height') === `${ab0.h}mm`, `${svg0.getAttribute('width')}x${svg0.getAttribute('height')}`);
      assert('print: viewBox frames the artboard region', svg0.getAttribute('viewBox') === `${ab0.x * PX} ${ab0.y * PX} ${ab0.w * PX} ${ab0.h * PX}`, svg0.getAttribute('viewBox'));
      assert('print: screen aids stripped from the clone', !svg0.querySelector('.artboard-rect') && !svg0.querySelector('.grid-bg') && !svg0.querySelector('defs'), 'aid leaked into print');

      const exp = artboardSVGClone(S.artboards[1]);
      const ab1 = S.artboards[1];
      assert('export: clone viewBox = active artboard region', exp.getAttribute('viewBox') === `${ab1.x * PX} ${ab1.y * PX} ${ab1.w * PX} ${ab1.h * PX}`, exp.getAttribute('viewBox'));
      assert('export: clone strips the page outline', exp.querySelectorAll('.artboard-rect,.artboard-label').length === 0, 'outline leaked into export');
      // export-all: one file per artboard, distinct names, each framed to its own region
      const exAll = buildSVGExports(true), exActive = buildSVGExports(false);
      assert('export-all: one entry per artboard', exAll.length === S.artboards.length, `${exAll.length}`);
      assert('export-active: a single entry', exActive.length === 1, `${exActive.length}`);
      assert('export-all: filenames are distinct', new Set(exAll.map(o => o.name)).size === exAll.length, exAll.map(o => o.name).join(','));
      assert('export-all: each svg frames its artboard', exAll.every((o, i) => o.svg.includes(`viewBox="${S.artboards[i].x * PX} ${S.artboards[i].y * PX} ${S.artboards[i].w * PX} ${S.artboards[i].h * PX}"`)), 'viewBox mismatch');
      // export entries carry stem + mm dimensions (the PNG rasteriser needs w/h to size the canvas)
      assert('export: entries carry stem + w/h', exAll.every((o, i) => o.stem && o.w === S.artboards[i].w && o.h === S.artboards[i].h), 'missing stem/w/h');

      // delete keeps at least one
      deleteArtboard(S.activeArtboard);
      assert('artboards: delete → one left', S.artboards.length === 1, `n=${S.artboards.length}`);
      deleteArtboard(S.artboards[0].id);
      assert('artboards: refuses to delete the last one', S.artboards.length === 1, `n=${S.artboards.length}`);

      // migration: an old v12 file (settings.page only, no artboards[]) wraps into artboards[0]
      reset();
      const legacy = { version: 12, shapes: [], nextId: 1,
        settings: { page: { preset: 'A3', orient: 'landscape', w: 420, h: 297, name: 'Legacy' } } };
      applyLoadedData(legacy);
      assert('artboards: legacy migrates to one artboard', S.artboards.length === 1, `n=${S.artboards.length}`);
      assert('artboards: legacy artboard at origin', S.artboards[0].x === 0 && S.artboards[0].y === 0, `${S.artboards[0].x},${S.artboards[0].y}`);
      assert('artboards: legacy page fields carried', S.page.preset === 'A3' && S.page.name === 'Legacy', `${S.page.preset}/${S.page.name}`);

      // ── artboard geometry is on the undo stack (v0.7.3) ──
      reset();
      addArtboard();
      assert('artboards-undo: add created a 2nd artboard', S.artboards.length === 2, `${S.artboards.length}`);
      undo();
      assert('artboards-undo: undo removes the add', S.artboards.length === 1, `${S.artboards.length}`);
      redo();
      assert('artboards-undo: redo restores the add', S.artboards.length === 2, `${S.artboards.length}`);
      const mid = S.artboards[1].id, ax0 = S.artboards[1].x;
      // simulate a move commit (what onUp does): snapshot → mutate → pushUndo(snap)
      const moveSnap = snapshot(); S.artboards[1].x = ax0 + 50; pushUndo(moveSnap); updateHistStatus();
      assert('artboards-undo: moved', getArtboard(mid).x === ax0 + 50, `${getArtboard(mid).x}`);
      undo();
      assert('artboards-undo: undo restores the position', getArtboard(mid).x === ax0, `${getArtboard(mid).x}`);
      deleteArtboard(mid);
      assert('artboards-undo: deleted', !getArtboard(mid), 'still present');
      undo();
      assert('artboards-undo: undo restores the deleted artboard', !!getArtboard(mid), 'not restored');
      reset();
    },

    // ── multi-file tabs (v0.7.13): per-document state isolation + new/switch/close + openDocInTab ──
    // The active doc lives in S; inactive tabs hold a stash. Switching captures the slice out of S
    // into the outgoing tab and applies the incoming tab's slice back in. closeTab on a tab WITHOUT
    // shapes takes the no-confirm path, which mutates synchronously (no await), so we can assert
    // immediately; tabs with shapes are never closed here (that path awaits confirmModal).
    tabs() {
      reset(); // also collapses to a single Untitled tab
      assert('tabs: starts with one tab', S.tabs.length === 1 && S.activeTab === 0, `n=${S.tabs.length}`);

      addShape({ type: 'rect', x: 0, y: 0, w: 50, h: 40 });
      const aId = S.shapes[0].id;
      assert('tabs: tab A has a shape', S.shapes.length === 1, `n=${S.shapes.length}`);

      newTab();
      assert('tabs: newTab adds a tab', S.tabs.length === 2, `n=${S.tabs.length}`);
      assert('tabs: new tab is active + blank', S.activeTab === 1 && S.shapes.length === 0, `a=${S.activeTab},n=${S.shapes.length}`);

      addShape({ type: 'circle', cx: 20, cy: 20, r: 10 });
      assert('tabs: tab B has its own shape', S.shapes.length === 1 && S.shapes[0].type === 'circle', S.shapes[0] && S.shapes[0].type);

      switchTab(0);
      assert('tabs: switch back restores A (state isolated)', S.shapes.length === 1 && S.shapes[0].id === aId && S.shapes[0].type === 'rect', S.shapes[0] && S.shapes[0].type);
      assert('tabs: A keeps its own history', S.hist.length === 1, `hist=${S.hist.length}`);

      switchTab(1);
      assert('tabs: switch to B restores its shape', S.shapes.length === 1 && S.shapes[0].type === 'circle', S.shapes[0] && S.shapes[0].type);

      // background close of an empty tab leaves the active doc untouched
      switchTab(0);   // A active
      newTab();       // C (index 2), active + empty
      switchTab(0);   // back to A; C parked empty
      closeTab(2);    // empty background tab → no confirm
      assert('tabs: closed an empty background tab', S.tabs.length === 2, `n=${S.tabs.length}`);
      assert('tabs: active doc untouched by background close', S.shapes.length === 1 && S.shapes[0].id === aId, 'active changed');

      // openDocInTab on a non-pristine active doc → opens a NEW tab carrying the loaded data
      const before = S.tabs.length;
      openDocInTab(buildSaveData(), null);
      assert('tabs: openDocInTab opened a new tab', S.tabs.length === before + 1, `n=${S.tabs.length}`);
      assert('tabs: opened doc carries its shapes', S.shapes.length === 1, `n=${S.shapes.length}`);

      // closing the only tab resets to a single blank doc
      S.tabs = [S.tabs[S.activeTab]]; S.activeTab = 0; delete S.tabs[0].doc;
      S.shapes = [];  // empty → close takes the no-confirm reset path
      closeTab(0);
      assert('tabs: closing the only tab keeps one blank tab', S.tabs.length === 1 && S.shapes.length === 0, `n=${S.tabs.length},sh=${S.shapes.length}`);

      reset(); // leave clean for following features
    },

    // ── rotation (v0.4): stored as a `rot` field, applied as a render transform ──
    rotate() {
      reset();
      S.zoom = 1;
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 10 }); // centre (10,5)
      const id = S.shapes[0].id, r = S.shapes[0];
      assert('rotate: rot absent by default', r.rot === undefined, `rot=${r.rot}`);

      // worldAABB of an unrotated rect == its geometry
      let b = worldAABB(r);
      assert('worldAABB unrotated = geometry', b.x1 === 0 && b.y1 === 0 && b.x2 === 20 && b.y2 === 10, JSON.stringify(b));

      // rotate 90° → bbox swaps to 10 wide x 20 tall, same centre (10,5)
      r.rot = 90;
      b = worldAABB(r);
      assertNear('worldAABB rot90 width = 10', b.x2 - b.x1, 10, 1e-6);
      assertNear('worldAABB rot90 height = 20', b.y2 - b.y1, 20, 1e-6);
      assertNear('worldAABB keeps centre x', (b.x1 + b.x2) / 2, 10, 1e-6);
      assertNear('worldAABB keeps centre y', (b.y1 + b.y2) / 2, 5, 1e-6);

      // the render path actually emits the rotate() transform for a rotated shape
      renderContent();
      assert('render: rotated shape wrapped in rotate() transform', /transform="rotate\(90 /.test(vp.innerHTML), 'no rotate transform found');

      // toLocal inverts the rotation about the centre
      const c = shapeCenter(r);
      const w0 = rotPt(0, 0, c.x, c.y, 90);       // where local (0,0) lands in world
      const l0 = toLocal(w0.x, w0.y, r);
      assertNear('toLocal round-trips x', l0.x, 0, 1e-6);
      assertNear('toLocal round-trips y', l0.y, 0, 1e-6);

      // hit-testing de-rotates: a click at the rotated position of an interior point HITS;
      // a point inside the *unrotated* footprint but outside the rotated one MISSES.
      const inW = rotPt(2, 2, c.x, c.y, 90);
      assert('hitShape hits rotated shape at its rotated position', hitShape(inW.x, inW.y) === id, `got ${hitShape(inW.x, inW.y)}`);
      assert('hitShape misses where the shape no longer is', hitShape(18, 5) === null, `got ${hitShape(18, 5)}`);

      // rot + the rotate-snap setting survive save/load
      const wire = JSON.parse(JSON.stringify(buildSaveData()));
      assert('rotate: settings.rotStep saved', wire.settings.rotStep === S.rotStep, `rotStep=${wire.settings.rotStep}`);
      applyLoadedData(wire);
      assertNear('rotate: rot survives round-trip', S.shapes[0].rot, 90, 1e-9);

      // beginRotate arms the drag; the inline onMove formula snaps to S.rotStep°
      reset(); S.zoom = 1; S.rotStep = 15;
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 10 });
      const rr = S.shapes[0], cc = shapeCenter(rr);
      S.selId = rr.id;
      beginRotate(rr, { x: cc.x + 10, y: cc.y }); // grab at angle 0
      assert('beginRotate arms rotating + snapshot', S.rotating === true && !!S.rotOrig, `rotating=${S.rotating}`);
      const ang = 40 * Math.PI / 180, mm = { x: cc.x + 10 * Math.cos(ang), y: cc.y + 10 * Math.sin(ang) };
      const cur = Math.atan2(mm.y - S.rotStart.cy, mm.x - S.rotStart.cx);
      let deg = S.rotStart.rot + (cur - S.rotStart.ang) * 180 / Math.PI;
      deg = ((Math.round(deg / S.rotStep) * S.rotStep) % 360 + 360) % 360;
      assertNear('rotate drag snaps to 45 (step 15)', deg, 45, 1e-6);
      S.rotating = false; S.rotStart = null; S.rotOrig = null;

      // rotate ring: a point just outside a corner is in the ring; the centre is not
      reset(); S.zoom = 1;
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 20 });
      S.selId = S.shapes[0].id;
      const aMM = 13 / (S.zoom * PX); // 13 screen-px out from corner (0,0) → inside the 7..20px ring
      assert('hitRotateZone: just outside a corner', hitRotateZone(-aMM, 0) === true, 'expected ring hit');
      assert('hitRotateZone: shape centre is not a rotate zone', hitRotateZone(10, 10) === false, 'centre should not rotate');

      // frozen-pivot resize: growing the EAST side of a rotated rect must leave the WEST edge
      // fixed in world space (no pivot drift). Simulate an east drag (local x fixed, w grows)
      // wrapped by beginEditPivot/rebakeEditPivot, then check the west-edge midpoint world pos.
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 10 });
      const rot = S.shapes[0]; rot.rot = 30;
      const c0 = shapeCenter(rot);
      const westBefore = rotPt(0, 5, c0.x, c0.y, 30); // local west-edge midpoint → world
      beginEditPivot(rot);
      rot.w = 30; // grow east; local (x,y) unchanged
      rebakeEditPivot();
      const cc1 = shapeCenter(rot);
      const westAfter = rotPt(rot.x, rot.y + rot.h / 2, cc1.x, cc1.y, 30);
      assertNear('rotated resize keeps west edge fixed (x)', westAfter.x, westBefore.x, 1e-6);
      assertNear('rotated resize keeps west edge fixed (y)', westAfter.y, westBefore.y, 1e-6);
      assert('rebake clears the frozen pivot', S.editPivot === null, `editPivot=${JSON.stringify(S.editPivot)}`);

      // rotation-aware resize cursors: a 90°-rotated rect's east handle resizes vertically,
      // its north handle horizontally; the top edge likewise flips to ew-resize.
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 10 });
      const cs = S.shapes[0]; S.selId = cs.id;
      cs.rot = 0;
      assert("cursor: unrotated 'e' handle = ew-resize", getCursorForHandle('e') === 'ew-resize', getCursorForHandle('e'));
      cs.rot = 90;
      assert("cursor: 90deg 'e' handle = ns-resize", getCursorForHandle('e') === 'ns-resize', getCursorForHandle('e'));
      assert("cursor: 90deg 'n' handle = ew-resize", getCursorForHandle('n') === 'ew-resize', getCursorForHandle('n'));
      assert("cursor: 90deg top edge = ew-resize", edgeCursor(cs, 0) === 'ew-resize', edgeCursor(cs, 0));
      cs.rot = 45;
      assert("cursor: 45deg 'e' handle = nwse-resize", getCursorForHandle('e') === 'nwse-resize', getCursorForHandle('e'));
    },

    // ── stitch guard: margin larger than shape → null (no dots) ──
    'stitch-guard'() {
      const tiny = { type: 'rect', x: 0, y: 0, w: 4, h: 4, stitchMargin: 3, stitchSpacing: 3.38 };
      assert('rect stitch guards oversized margin (returns null)', stitchRect(tiny) === null, stitchRect(tiny));
    },

    // ── Seam tool (v15): multi-edge selection across shapes ──
    seam() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });   // id → 4 edges
      addShape({ type: 'circle', cx: 150, cy: 40, r: 20 });    // 0 edges (not pickable)
      const rectId = S.shapes[0].id, circId = S.shapes[1].id;
      setTool('seam');
      assert('seam: tool engaged', S.tool === 'seam');
      assert('seam: setTool cleared picks', S.seamSel.length === 0);
      const hit = hitAnyEdge(50, 0);   // on the rect's top edge (edge 0)
      assert('seam: hitAnyEdge finds the rect top edge', hit && hit.id === rectId && hit.edge === 0, JSON.stringify(hit));
      assert('seam: circle has no pickable edge', hitAnyEdge(170, 40) === null);
      toggleSeamPick(rectId, 0);
      toggleSeamPick(rectId, 2);
      assert('seam: two picks added', S.seamSel.length === 2, `n=${S.seamSel.length}`);
      assert('seam: seamPickIndex locates a pick', seamPickIndex(rectId, 2) === 1, `idx=${seamPickIndex(rectId, 2)}`);
      toggleSeamPick(rectId, 0);   // toggle off
      assert('seam: toggle removes a pick', S.seamSel.length === 1 && seamPickIndex(rectId, 0) < 0);
      S.shapes[0].hidden = true;
      assert('seam: hidden shape edge not pickable', hitAnyEdge(50, 0) === null);
      S.shapes[0].hidden = false; S.shapes[0].locked = true;
      assert('seam: locked shape edge not pickable', hitAnyEdge(50, 0) === null);
      S.shapes[0].locked = false;
      // Step 3 — create a seam from the pending picks (seamSel currently has rect edge 2)
      toggleSeamPick(rectId, 0);   // → picks {edge 2, edge 0}
      createSeamFromSelection();
      assert('seam: create makes one seam', S.assembly.seams.length === 1, `n=${S.assembly.seams.length}`);
      assert('seam: created seam has 2 members', S.assembly.seams[0].members.length === 2);
      assert('seam: create clears pending picks', S.seamSel.length === 0);
      assert('seam: created seam is active', S.activeSeam === S.assembly.seams[0].id);
      assert('seam: seamForEdge resolves a committed member', seamForEdge(rectId, 2) === S.assembly.seams[0]);
      assert('seam: Assembly section is shown', document.getElementById('sec-assembly').style.display !== 'none');
      assert('seam: list row rendered', document.getElementById('seams-list').innerHTML.includes('seam 1'));
      assert('seam: canvas overlay drawn (seam-aid)', document.getElementById('vp').innerHTML.includes('seam-aid'));
      selectSeam(S.assembly.seams[0].id);
      assert('seam: selectSeam toggles off the active seam', S.activeSeam === null);
      undo();
      assert('seam: undo removes the created seam', S.assembly.seams.length === 0);
      redo();
      assert('seam: redo restores the seam', S.assembly.seams.length === 1);
      const n0 = S.assembly.seams.length; S.seamSel = [];
      createSeamFromSelection();
      assert('seam: create with no picks is a no-op', S.assembly.seams.length === n0);
      toggleSeamPick(rectId, 1);
      setTool('select');
      assert('seam: leaving the tool clears picks', S.seamSel.length === 0);
      assert('seam: circle id unused (sanity)', typeof circId === 'number');

      // Step 4 — per-seam editor (operating on the one seam restored by redo above)
      const sid = S.assembly.seams[0].id;
      renameSeam(sid, 'spine');
      assert('seam: rename applies', S.assembly.seams[0].name === 'spine');
      setSeamType(sid, 'fold');
      assert('seam: type set to fold', S.assembly.seams[0].type === 'fold');
      setSeamField(sid, 'order', '2');
      assert('seam: order set from string', S.assembly.seams[0].order === 2);
      setSeamField(sid, 'allowance', '4.5');
      assert('seam: allowance set', S.assembly.seams[0].allowance === 4.5);
      setSeamField(sid, 'order', '');
      assert('seam: blank order clears to null', S.assembly.seams[0].order === null);
      // uniqueness: a 2nd seam renamed onto "spine" is auto-suffixed
      S.seamSel = [{ id: rectId, edge: 1 }];
      createSeamFromSelection();
      const sid2 = S.assembly.seams[1].id;
      renameSeam(sid2, 'spine');
      assert('seam: duplicate name auto-suffixed', S.assembly.seams[1].name === 'spine 2', S.assembly.seams[1].name);
      // add a picked (free) edge to the first seam
      S.seamSel = [{ id: rectId, edge: 3 }];
      const beforeAdd = S.assembly.seams[0].members.length;
      addPicksToSeam(sid);
      assert('seam: addPicksToSeam grows members', S.assembly.seams[0].members.length === beforeAdd + 1);
      assert('seam: addPicksToSeam clears picks', S.seamSel.length === 0);
      // remove a member
      const m0 = S.assembly.seams[0].members.length;
      removeSeamMember(sid, 0);
      assert('seam: removeSeamMember shrinks', S.assembly.seams[0].members.length === m0 - 1);
      // locate selects the shape + edge in the Select tool
      const lm = S.assembly.seams[0].members[0];
      locateSeamMember(lm.shape, lm.edge);
      assert('seam: locate switches to Select tool', S.tool === 'select');
      assert('seam: locate selects the shape', S.selId === lm.shape);
      assert('seam: locate highlights the edge', S.selEdge && S.selEdge.edge === lm.edge);
      // edited fields survive a save/load round-trip
      const wireE = JSON.parse(JSON.stringify(buildSaveData()));
      applyLoadedData(wireE);
      const rs = S.assembly.seams.find(s => s.name === 'spine');
      assert('seam: edited fields survive round-trip', rs && rs.type === 'fold' && rs.allowance === 4.5, JSON.stringify(rs));
      // removing the last member of a 1-member seam drops the seam
      const solo = S.assembly.seams.find(s => s.members.length === 1) || S.assembly.seams[S.assembly.seams.length - 1];
      const soloId = solo.id, soloLen = solo.members.length, nSeams = S.assembly.seams.length;
      for (let k = soloLen - 1; k >= 0; k--) removeSeamMember(soloId, 0);
      assert('seam: emptying a seam removes it', S.assembly.seams.length === nSeams - 1 && !S.assembly.seams.some(s => s.id === soloId));

      // Step 5 — Tier-1 length-mismatch hint + Select-tool touchpoint
      const spine = S.assembly.seams.find(s => s.name === 'spine');   // members = rect edges 0 (100mm) + 3 (80mm)
      assert('seam: length mismatch detected (100 vs 80mm)', seamLengthIssues(spine).length >= 1, `issues=${seamLengthIssues(spine).length}`);
      goToSeam(spine.id);
      assert('seam: goToSeam jumps to the Seam tool + selects it', S.tool === 'seam' && S.activeSeam === spine.id);
      renderContent();
      assert('seam: editor shows the length-mismatch warning', document.getElementById('seam-editor').innerHTML.includes('Length mismatch'));
      // equal-length edges → no warning (rect edges 1 + 3 are both 80mm)
      S.assembly.seams = []; S._seamMap = new Map(); S.activeSeam = null;
      S.seamSel = [{ id: rectId, edge: 1 }, { id: rectId, edge: 3 }];
      createSeamFromSelection();
      assert('seam: equal-length edges → no mismatch', seamLengthIssues(S.assembly.seams[0]).length === 0);
      // Select-tool touchpoint: a committed edge surfaces a "Part of seam" jump
      setTool('select');
      S.selId = rectId; S.selEdge = { id: rectId, edge: 1 };
      updatePropsPanel();
      const sm = document.getElementById('seam-membership');
      assert('seam: select-tool shows seam membership', sm.style.display !== 'none' && sm.innerHTML.includes('Part of seam'));
      S.selEdge = { id: rectId, edge: 0 };   // a free edge → no membership
      updatePropsPanel();
      assert('seam: free edge hides membership', document.getElementById('seam-membership').style.display === 'none');

      // U6 viz — partial-seam sub-span band geometry (edgePointAt / edgeBandD).
      // Rect edge 0 is the top: a=(0,0) → b=(100,0). Interior offset = (-dy,dx) = (0,+1) (downward).
      assertNear('band: edgePointAt rect mid x', edgePointAt(S.shapes[0], 0, 0.5).x, 50, 0.001);
      assertNear('band: edgePointAt rect mid y', edgePointAt(S.shapes[0], 0, 0.5).y, 0, 0.001);
      assert('band: edgeBandD spans t0..t1, offset interior',
        edgeBandD(S.shapes[0], 0, 0.25, 0.75, 10) === 'M25,10 L75,10',
        edgeBandD(S.shapes[0], 0, 0.25, 0.75, 10));

      // U7 — shared stitch layout: every member gets the SAME hole count at matching fractions so
      // the holes coincide across the stack; member edges' independent stitching is overridden.
      reset();
      S.assembly.seams = []; S._seamMap = new Map(); S.activeSeam = null;   // reset() leaves assembly intact
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });   // edge 0 (top) + edge 2 (bottom) both 100mm
      const u7id = S.shapes[0].id;
      S.seamSel = [{ id: u7id, edge: 0 }, { id: u7id, edge: 2 }];
      createSeamFromSelection();
      let u7s = S.assembly.seams[0];
      setSeamShared(u7s.id, true);
      u7s = S.assembly.seams.find(s => s.id === u7s.id);
      assert('U7: shared flag set + default spacing', u7s.stitch && u7s.stitch.shared === true && u7s.stitch.spacing > 0, JSON.stringify(u7s.stitch));
      const u7lay = seamStitchLayout(u7s);
      const la = u7lay.get(u7id + ':0'), lb = u7lay.get(u7id + ':2');
      assert('U7: both members laid out', !!la && !!lb);
      assert('U7: members share hole count (coincide)', la.length === lb.length && la.length >= 2, `${la && la.length} vs ${lb && lb.length}`);
      const u7mg = (u7s.stitch.margin > 0 ? u7s.stitch.margin : (S.defMargin || 3));
      assert('U7: count = round(insetLen/spacing)+1', la.length === Math.round((100 - 2 * u7mg) / u7s.stitch.spacing) + 1, `n=${la.length}`);
      assert('U7: endpoints forced', la[0].forced && la[la.length - 1].forced);
      // end-hole fix: the run's end holes are inset by the margin ALONG the edge too (one inset
      // corner hole, like independent stitching), not at the raw edge ends.
      assertNear('U7fix: first hole inset along edge', la[0].x, u7mg, 0.01);
      assertNear('U7fix: first hole inset from edge', la[0].y, u7mg, 0.01);
      assertNear('U7fix: last hole inset along edge', la[la.length - 1].x, 100 - u7mg, 0.01);
      // edge owned by the shared seam is not independently stitched; a free edge still is
      S.shapes[0].hasStitch = true;
      assert('U7: member edge skipped by edgeStitched', edgeStitched(S.shapes[0], 0) === false);
      assert('U7: non-member edge still stitched', edgeStitched(S.shapes[0], 1) === true);
      // stitchFor surfaces the seam holes even when the shape has no independent stitch
      S.shapes[0].hasStitch = false;
      const u7sf = stitchFor(S.shapes[0]);
      assert('U7: stitchFor surfaces seam holes', u7sf && u7sf.pts.length === la.length + lb.length, `pts=${u7sf && u7sf.pts.length}`);
      // end-hole fix: independently stitch the two free perpendicular edges (1+3). Each corner is
      // now owned by ONE hole — the seam's inset end hole; the perpendicular edge's coincident
      // corner hole (start hole / far-corner push) is deduped. Exact expected total:
      // seam 2*(N+1) + each side edge (round(74/sp) holes) minus its deduped start corner.
      S.shapes[0].hasStitch = true; S.shapes[0].stitchEdges = [1, 3];
      const u7m2 = S.shapes[0].stitchMargin ?? S.defMargin, u7sp2 = S.shapes[0].stitchSpacing ?? S.defSpacing;
      const u7side = Math.max(1, Math.round((80 - 2 * u7m2) / u7sp2));   // holes i=0..N-1 per side edge
      const u7df = stitchFor(S.shapes[0]);
      assert('U7fix: one hole per corner (dedup vs side edges)',
        u7df.pts.length === la.length + lb.length + 2 * (u7side - 1),
        `pts=${u7df.pts.length} expected=${la.length + lb.length + 2 * (u7side - 1)}`);
      S.shapes[0].hasStitch = false; S.shapes[0].stitchEdges = undefined;
      // round-trip persistence + schema bump
      const wireU7 = JSON.parse(JSON.stringify(buildSaveData()));
      applyLoadedData(wireU7);
      const u7r = S.assembly.seams[0];
      assert('U7: shared stitch survives round-trip', u7r.stitch && u7r.stitch.shared === true, JSON.stringify(u7r.stitch));
      assert('U7: assembly schema bumped to v5', S.assembly.version >= 5, `v=${S.assembly.version}`);

      // ── Card-holder stack: 3 rects sharing a left-edge spine, each piece also independently
      // stitched on its other edges. Regression guard for "holes misalign/double": within any one
      // piece no two holes may sit closer than spacing*0.6, and all members must share the layout. ──
      reset();
      S.assembly.seams = []; S._seamMap = new Map(); S.activeSeam = null;
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 70 });    // back
      addShape({ type: 'rect', x: 0, y: 120, w: 100, h: 45 });  // front pocket
      addShape({ type: 'rect', x: 0, y: 240, w: 100, h: 45 });  // inner pocket
      const chIds = S.shapes.slice(0, 3).map(s => s.id);
      S.seamSel = chIds.map(id => ({ id, edge: 3 }));            // left edge of each = the spine
      createSeamFromSelection();
      const chSeam = S.assembly.seams[0];
      setSeamShared(chSeam.id, true);
      S.shapes.slice(0, 3).forEach(s => { s.hasStitch = true; });   // all edges independently stitched too
      const chLay = seamStitchLayout(S.assembly.seams[0]);
      const chRuns = chIds.map(id => chLay.get(id + ':3'));
      assert('cardholder: all 3 members laid out', chRuns.every(r => r && r.length >= 2));
      assert('cardholder: members share hole count', chRuns.every(r => r.length === chRuns[0].length), chRuns.map(r => r && r.length).join('/'));
      // holes coincide at matching fractions across members (same Y offsets along the shared spine)
      const chSp = S.assembly.seams[0].stitch.spacing, chMin = chSp * 0.6;
      let chDouble = 0;
      S.shapes.slice(0, 3).forEach(s => {
        const sf = stitchFor(s); if (!sf) return;
        for (let i = 0; i < sf.pts.length; i++) for (let j = i + 1; j < sf.pts.length; j++)
          if (Math.hypot(sf.pts[i].x - sf.pts[j].x, sf.pts[i].y - sf.pts[j].y) < chMin) chDouble++;
      });
      assert('cardholder: no doubled holes (>= spacing*0.6 apart)', chDouble === 0, `pairs too close=${chDouble}`);
      assert('cardholder: shared-run connector emitted', (() => { renderContent(); return document.getElementById('vp').innerHTML.includes('polyline'); })(), 'no run polyline');
      // Unequal-margin corner: the back piece's own edges use a 5mm margin while the seam uses the
      // 3mm default, so the perpendicular corner hole and the seam end hole land ~2.8mm apart — the
      // doubling the user saw. The seam owns its corners, so the independent corner must drop.
      S.shapes[0].stitchMargin = 5;
      let chDbl2 = 0; { const sf = stitchFor(S.shapes[0]);
        // tighter than the nominal spacing: a corner double lands ~sqrt(2)*|5-3|=2.8mm apart, well
        // inside the 3.38mm interval, so spacing*0.9 catches it (and the structural fix removes it).
        for (let i = 0; i < sf.pts.length; i++) for (let j = i + 1; j < sf.pts.length; j++)
          if (Math.hypot(sf.pts[i].x - sf.pts[j].x, sf.pts[i].y - sf.pts[j].y) < chSp * 0.9) chDbl2++; }
      assert('cardholder: no double at a seam corner with a mismatched edge margin', chDbl2 === 0, `pairs too close=${chDbl2}`);
      S.shapes[0].stitchMargin = undefined;

      // partial overlap: a sub-span member still shares the layout (anchored)
      reset();
      S.assembly.seams = []; S._seamMap = new Map(); S.activeSeam = null;
      // mm partial join: a 100mm edge mated to a 50mm edge → run auto-derives to the 50mm mating edge.
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });   // long member: top edge = 100mm
      addShape({ type: 'rect', x: 0, y: 200, w: 50, h: 80 });  // mating member: top edge = 50mm
      const u7p = S.shapes[0].id, u7q = S.shapes[1].id;
      S.seamSel = [{ id: u7p, edge: 0 }, { id: u7q, edge: 0 }];
      createSeamFromSelection();
      const ps = S.assembly.seams[0];
      setSeamFit(ps.id, 'partial');
      setSeamShared(ps.id, true);
      const seamOf = () => S.assembly.seams.find(s => s.id === ps.id);
      const sp = seamOf().stitch.spacing;
      // offset 0 from start → the 100mm member sews its first 50mm (= mating edge); holes stay <= 50mm
      let pl = seamStitchLayout(seamOf());
      let pa = pl.get(u7p + ':0');
      const pmg = (seamOf().stitch.margin > 0 ? seamOf().stitch.margin : (S.defMargin || 3));
      assert('U6mm: run auto = mating (50mm) edge, ends inset', pa.length === Math.round((50 - 2 * pmg) / sp) + 1, `n=${pa.length}`);
      assert('U6mm: offset 0 → holes in the first 50mm', pa.every(p => p.x <= 50.001), 'a hole ran past the 50mm run');
      // offset 25mm from start → the 50mm run slides to x in [25,75]
      setMemberOffset(ps.id, 0, '25');
      pl = seamStitchLayout(seamOf()); pa = pl.get(u7p + ':0');
      assert('U6mm: offset 25 shifts the run to [25,75]', pa.every(p => p.x >= 24.999 && p.x <= 75.001), `xs=${pa.map(p=>p.x.toFixed(1))}`);
      assert('U6mm: member stores offset in mm', seamOf().members[0].offset === 25, JSON.stringify(seamOf().members[0]));
      // measure-from the far end → run sits in the LAST 50mm, x in [50,100]
      setMemberOffset(ps.id, 0, '0'); setMemberFrom(ps.id, 0, 'end');
      pl = seamStitchLayout(seamOf()); pa = pl.get(u7p + ':0');
      assert('U6mm: from=end → run in the last 50mm', pa.every(p => p.x >= 49.999 && p.x <= 100.001), `xs=${pa.map(p=>p.x.toFixed(1))}`);

      // ── v5 guide: a directional alignment annotation (multi-edge → single target edge). No
      // stitching, no length-mismatch flag; members[0] is the target, setSeamTarget reorders. ──
      reset();
      S.assembly.seams = []; S._seamMap = new Map(); S.activeSeam = null;
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 10 });    // long target piece
      addShape({ type: 'rect', x: 0, y: 40, w: 20, h: 10 });    // small source tab
      const gT = S.shapes[0].id, gS = S.shapes[1].id;
      S.seamSel = [{ id: gT, edge: 0 }, { id: gS, edge: 0 }];
      createSeamFromSelection();
      const gSeam = S.assembly.seams[0];
      setSeamType(gSeam.id, 'guide');
      assert('guide: type set to guide', S.assembly.seams[0].type === 'guide');
      assert('guide: unequal lengths NOT flagged', seamLengthIssues(S.assembly.seams[0]).length === 0);
      assert('guide: target is member 0', S.assembly.seams[0].members[0].shape === gT);
      // setSeamTarget moves the source to the front → it becomes the target
      setSeamTarget(gSeam.id, 1);
      assert('guide: setSeamTarget reorders to index 0', S.assembly.seams[0].members[0].shape === gS, JSON.stringify(S.assembly.seams[0].members.map(m => m.shape)));
      setSeamTarget(gSeam.id, 1);   // put it back so the long edge is the target again
      // a guide owns no stitching — its member edges stitch independently if the shape says so
      assert('guide: does not own stitching (edgeStitched unaffected)', sharedSeamForEdge(gT, 0) === null);
      // guide renders its alignment overlay on the canvas (all seams show in the Seam tool)
      setTool('seam'); renderContent();
      assert('guide: canvas overlay drawn (seam-aid)', document.getElementById('vp').innerHTML.includes('seam-aid'));
      // round-trip: type + members survive, assembly schema is v5
      const wireG = JSON.parse(JSON.stringify(buildSaveData()));
      applyLoadedData(wireG);
      assert('guide: type survives round-trip', S.assembly.seams[0].type === 'guide');
      assert('guide: 2 members survive round-trip', S.assembly.seams[0].members.length === 2);
      assert('guide: assembly schema is v5', S.assembly.version >= 5, `v=${S.assembly.version}`);
      // restore the scene the folds section below expects: a rect at origin (id resets to 1 = rectId)
      reset(); addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });
      S.assembly.seams = []; S._seamMap = new Map(); S.activeSeam = null;

      // ── Folds (v15): crease authoring via the Seam tool's fold sub-mode ──
      setTool('seam'); setFoldMode(true);
      assert('fold: fold mode engaged', S.foldMode === true);
      const nf0 = S.assembly.folds.length;
      foldClick(20, 40);                       // 1st click → pick the rect + start point
      assert('fold: first click starts a draft', !!S.foldDraft && S.foldDraft.shape === rectId, JSON.stringify(S.foldDraft));
      assert('fold: draft adds no fold yet', S.assembly.folds.length === nf0);
      foldClick(80, 40);                       // 2nd click → commit the crease
      assert('fold: second click commits a crease', S.assembly.folds.length === nf0 + 1);
      assert('fold: draft cleared after commit', S.foldDraft === null);
      const fold = S.assembly.folds[S.assembly.folds.length - 1], fid = fold.id;
      assert('fold: crease owns the clicked piece', fold.shape === rectId);
      assert('fold: endpoints stored', fold.a.x === 20 && fold.b.x === 80 && fold.a.y === 40, JSON.stringify([fold.a, fold.b]));
      assert('fold: default angle 0', fold.angle === 0);
      // too-short crease is rejected (draft lingers so the user can retry)
      const nf1 = S.assembly.folds.length;
      foldClick(40, 40); foldClick(40, 40.2);
      assert('fold: zero-length crease rejected', S.assembly.folds.length === nf1);
      S.foldDraft = null;
      // edit: select + angle (mountain +, valley -, clamped) + rename
      selectFold(fid);
      assert('fold: selectFold sets active', S.activeFold === fid);
      setFoldAngle(fid, '90');
      assert('fold: angle set to mountain 90', fold.angle === 90);
      setFoldAngle(fid, '-45');
      assert('fold: valley angle -45', fold.angle === -45);
      setFoldAngle(fid, '999');
      assert('fold: angle clamped to 180', fold.angle === 180);
      renameFold(fid, 'flap crease');
      assert('fold: rename applies', fold.name === 'flap crease');
      // panel + canvas rendering
      renderContent();
      assert('fold: list row rendered', document.getElementById('folds-list').innerHTML.includes('flap crease'));
      assert('fold: editor shows angle field', document.getElementById('fold-editor').innerHTML.includes('fold-angle'));
      assert('fold: canvas crease drawn (violet)', document.getElementById('vp').innerHTML.includes('a78bfa'));
      // locate selects the owning piece + highlights the crease in any tool
      setTool('select');
      locateFold(fid);
      assert('fold: locate selects the owning piece', S.selId === rectId && S.activeFold === fid);
      // undo / redo (assembly rides in the doc snapshot)
      setTool('seam'); setFoldMode(true);
      const nb = S.assembly.folds.length;
      foldClick(10, 10); foldClick(90, 70);
      assert('fold: new crease added', S.assembly.folds.length === nb + 1);
      undo();
      assert('fold: undo removes the crease', S.assembly.folds.length === nb);
      redo();
      assert('fold: redo restores the crease', S.assembly.folds.length === nb + 1);
      // round-trip through the .lpd
      const wireF = JSON.parse(JSON.stringify(buildSaveData()));
      applyLoadedData(wireF);
      const rf = S.assembly.folds.find(f => f.name === 'flap crease');
      assert('fold: survives round-trip (name+angle+shape)', rf && rf.angle === 180 && rf.shape === rectId, JSON.stringify(rf));
      assert('fold: round-trip cleared the active selection', S.activeFold === null);
      // deleting the owning piece prunes its creases (validateSeams)
      const pruneId = S.assembly.folds[0].shape, hadFolds = S.assembly.folds.length;
      S.shapes = S.shapes.filter(s => s.id !== pruneId);
      validateSeams({ quiet: true });
      assert('fold: creases pruned when their piece is deleted', S.assembly.folds.length < hadFolds && S.assembly.folds.every(f => f.shape !== pruneId));
    },

    // ── zoom-fit bounding box correctness (getFitBox = shapes union + every artboard) ──
    bbox() {
      buildScene();
      const bb = getFitBox();
      assert('fitbox covers the shape union (0,0..170,180)',
        bb.x <= 0.001 && bb.y <= 0.001 && bb.x + bb.w >= 169.999 && bb.y + bb.h >= 179.999,
        JSON.stringify(bb));
      assert('fitbox covers every artboard',
        S.artboards.every(a => bb.x <= a.x + 0.001 && bb.y <= a.y + 0.001 &&
          bb.x + bb.w >= a.x + a.w - 0.001 && bb.y + bb.h >= a.y + a.h - 0.001),
        JSON.stringify(bb));
      zoomFit();
      assert('zoomFit → zoom is finite and positive', isFinite(S.zoom) && S.zoom > 0, `zoom=${S.zoom}`);
      assert('zoomFit → zoom within clamp (max 10)', S.zoom <= 10, `zoom=${S.zoom}`);
    },

    // ── a11y: clickable divs promoted to real (keyboard-activatable, announced) controls ──
    a11y() {
      reset();
      // kbActivate: Enter/Space on the element itself fires its click + preventDefault
      let clicked = 0, prevented = 0;
      const el = document.createElement('div');
      el.addEventListener('click', () => clicked++);
      kbActivate({ key: 'Enter', target: el, currentTarget: el, preventDefault() { prevented++; } });
      assert('a11y: kbActivate Enter fires click', clicked === 1, `clicked=${clicked}`);
      assert('a11y: kbActivate calls preventDefault', prevented === 1, `p=${prevented}`);
      kbActivate({ key: ' ', target: el, currentTarget: el, preventDefault() { } });
      assert('a11y: kbActivate Space fires click', clicked === 2, `clicked=${clicked}`);
      // a key bubbling up from an inner control (target !== currentTarget) is ignored → no double-fire
      kbActivate({ key: 'Enter', target: document.createElement('button'), currentTarget: el, preventDefault() { } });
      assert('a11y: kbActivate ignores bubbled inner keydown', clicked === 2, `clicked=${clicked}`);
      kbActivate({ key: 'a', target: el, currentTarget: el, preventDefault() { } });
      assert('a11y: kbActivate ignores other keys', clicked === 2, `clicked=${clicked}`);

      // section headers became real buttons during init (focusable + expand state announced)
      const hd = document.getElementById('hd-shape');
      assert('a11y: section header role=button', hd.getAttribute('role') === 'button', hd.getAttribute('role'));
      assert('a11y: section header focusable', hd.tabIndex === 0, `ti=${hd.tabIndex}`);
      assert('a11y: section header announces expand state', hd.hasAttribute('aria-expanded'), 'no aria-expanded');
      const before = hd.getAttribute('aria-expanded');
      toggleSection('shape');
      assert('a11y: toggleSection flips aria-expanded', hd.getAttribute('aria-expanded') !== before, `${before}→${hd.getAttribute('aria-expanded')}`);
      toggleSection('shape'); // restore

      // dynamically-rendered controls carry role=button + tabindex + the keyboard handler
      const lr = layerRowHTML({ id: 1, type: 'rect', x: 0, y: 0, w: 10, h: 10 }, false, true, true, false);
      assert('a11y: layer row is a button', /role="button"/.test(lr) && /tabindex="0"/.test(lr) && /onkeydown="kbActivate/.test(lr), 'layer row missing a11y attrs');

      addShape({ type: 'rect', x: 0, y: 0, w: 10, h: 10 });
      S.selId = S.shapes[0].id; updatePropsPanel();
      const sw = document.getElementById('pi-colors').innerHTML;
      assert('a11y: colour swatches are buttons', /role="button"/.test(sw) && /onkeydown="kbActivate/.test(sw), 'swatch missing a11y attrs');

      addArtboard();
      assert('a11y: artboard rows are buttons', /role="button"/.test(document.getElementById('artboards-list').innerHTML), 'artboard row missing role');

      renderTabs();
      assert('a11y: tabs are buttons', /aria-label="Switch to/.test(document.getElementById('tabbar').innerHTML), 'tab missing a11y attrs');
    },

    // ── readability: property-panel field labels must fully fit (no clipping) ──
    // Regression guard for the seam-editor labels that were truncated to
    // "Ord"/"Allo"/"Anc"/"Star" because they reused the 13px .p-fl class.
    // A flex-item label whose text overflows its box has scrollWidth > clientWidth.
    readability() {
      reset();
      addShape({ type: 'rect', x: 0, y: 0, w: 100, h: 80 });
      const rectId = S.shapes[0].id;
      // Build a 2-member PARTIAL seam so the editor shows every multi-char label
      // (Order, Allow., Join, Anchor, and per-member Start %/End %).
      S.seamSel = [{ id: rectId, edge: 0 }, { id: rectId, edge: 2 }];
      createSeamFromSelection();
      const sid = S.assembly.seams[0].id;
      setSeamFit(sid, 'partial');
      S.activeSeam = sid;
      setTool('seam');
      renderContent();
      const ed = document.getElementById('seam-editor');
      const labels = [...ed.querySelectorAll('.p-fl, .p-fl-w')];
      assert('readability: seam editor renders its field labels', labels.length >= 6, `n=${labels.length}`);
      // Guard against a false pass if the panel didn't lay out (clientWidth 0 everywhere).
      assert('readability: labels are laid out (panel visible)', labels.some(el => el.clientWidth > 0), 'all labels have 0 width');
      const clip = labels.filter(el => el.scrollWidth > el.clientWidth + 1)
        .map(el => `"${el.textContent}" (${el.clientWidth}<${el.scrollWidth})`);
      assert('readability: no clipped seam-editor labels', clip.length === 0, clip.join(', '));

      // Same guard on the shape-properties panel (Angle uses the wide label too).
      addShape({ type: 'rect', x: 0, y: 0, w: 20, h: 20 });
      S.selId = S.shapes[S.shapes.length - 1].id; setTool('select'); updatePropsPanel();
      const pp = [...document.getElementById('props').querySelectorAll('.p-fl, .p-fl-w')]
        .filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
        .map(el => `"${el.textContent}"`);
      assert('readability: no clipped shape-props labels', pp.length === 0, pp.join(', '));
    },
  };

  // Tier → ordered feature list. quick = fast logic; full = everything.
  const ORDER = ['core', 'history', 'saveload', 'page', 'color', 'snap',
    'stitch-rect', 'peredge', 'stitch-circle', 'stitch-path', 'stitch-convert', 'stitch-acute', 'stitch-radii', 'anchor-type', 'pen-grid', 'pen-anchor', 'pen-close', 'pen-resume', 'path-handles', 'label-fit', 'multiselect', 'duplicate', 'emptystate', 'toolux', 'stitch-inputs', 'layers', 'layer-groups', 'text', 'home', 'help', 'quickstart', 'updatecheck', 'artboards', 'tabs', 'rotate', 'stitch-guard', 'seam', 'bbox', 'a11y', 'readability'];
  const TIERS = { quick: ['core', 'history'], full: ORDER };

  // Resolve the spec into a list of feature names.
  function resolve(spec) {
    const s = String(spec || 'quick').trim();
    if (TIERS[s]) return TIERS[s].slice();
    return s.split(/[\s,]+/).filter(Boolean);
  }

  let ran = [];
  try {
    const names = resolve(spec);
    for (const name of names) {
      if (!FEATURES[name]) {
        assert(`unknown feature "${name}"`, false, 'available: ' + ORDER.join(', '));
        continue;
      }
      ran.push(name);
      FEATURES[name]();
    }
    return finish();
  } catch (e) {
    aborted = (e && e.stack) ? e.stack : String(e);
    assert('harness ran without throwing', false, aborted);
    return finish();
  }

  function finish() {
    const passed = results.filter(r => r.pass).length;
    const out = { tier: ran.join('+') || String(spec), features: ran, total: results.length, passed, failed: results.length - passed, results, aborted };
    const pre = document.createElement('pre');
    pre.id = '__smoke_out';
    // Markers are assembled from fragments so these literal strings do NOT
    // appear contiguously in this source file — otherwise the runner's regex
    // would match the harness's own <script> text in the DOM dump.
    const START = '__SMOKE' + '_JSON__';
    const END = '__' + 'END__';
    pre.textContent = START + JSON.stringify(out) + END;
    document.body.appendChild(pre);
    return out;
  }
};
