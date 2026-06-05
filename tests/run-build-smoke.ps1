# ====================================================================
#  run-build-smoke.ps1  -  Leather Pattern Designer DESKTOP build smoke
#
#  Static contract + version-sync checks for the Tauri desktop wiring.
#  This is the build-side counterpart to run-smoke.ps1 (which exercises
#  the in-browser app logic in headless Edge). It does NOT open a browser
#  and does NOT need the exe to run; it verifies that the Rust side and
#  the index.html frontend agree on the command/event contract, that the
#  required plugins + capabilities are declared, and that every version
#  string is in sync. Pass -Compile to also run `cargo check`.
#
#  Why separate: the HTML smoke harness has no window.__TAURI__, so it
#  can never catch a renamed Tauri command, a mismatched event name, a
#  missing plugin, or a stale version. Those are exactly the bugs that
#  only bite in the packaged exe. This script catches them in ~1s.
#
#  Usage:  powershell -File tests\run-build-smoke.ps1
#          powershell -File tests\run-build-smoke.ps1 -Compile
#  Exit code 0 = all passed, 1 = a check failed.
# ====================================================================
param(
  [switch]$Compile
)
$ErrorActionPreference = 'Stop'

$root    = Split-Path -Parent $PSScriptRoot                 # project root (parent of tests\)
$index   = Join-Path $root 'index.html'
$tauriSr = Join-Path $root 'desktop\src-tauri'
$mainRs  = Join-Path $tauriSr 'src\main.rs'
$cargo   = Join-Path $tauriSr 'Cargo.toml'
$conf    = Join-Path $tauriSr 'tauri.conf.json'
$caps    = Join-Path $tauriSr 'capabilities\default.json'
$binfo   = Join-Path $root 'desktop\build-info.json'

$script:results = @()
function Assert($name, $cond, $detail) {
  $script:results += [pscustomobject]@{ name = $name; pass = [bool]$cond; detail = $detail }
}
function Need($path) {
  if (-not (Test-Path $path)) { Write-Host "FATAL: missing $path" -ForegroundColor Red; exit 2 }
  Get-Content $path -Raw -Encoding UTF8
}

# ---- load every file once ------------------------------------------
$html = Need $index
$rs   = Need $mainRs
$cg   = Need $cargo
$cf   = Need $conf | ConvertFrom-Json
$cp   = Need $caps | ConvertFrom-Json
$bi   = Need $binfo | ConvertFrom-Json

# ---- 1. plugins declared in Cargo.toml -----------------------------
Assert 'Cargo: tauri-plugin-dialog dep'          ($cg -match 'tauri-plugin-dialog')          'not in Cargo.toml'
Assert 'Cargo: tauri-plugin-single-instance dep' ($cg -match 'tauri-plugin-single-instance') 'not in Cargo.toml'

# ---- 2. plugins initialized in main.rs -----------------------------
Assert 'main.rs: dialog plugin init'          ($rs -match 'tauri_plugin_dialog::init')          'no .plugin(tauri_plugin_dialog::init())'
Assert 'main.rs: single-instance plugin init' ($rs -match 'tauri_plugin_single_instance::init') 'no .plugin(tauri_plugin_single_instance::init())'
# single-instance must be registered before other plugins (its callback runs in the primary instance)
$siIdx  = $rs.IndexOf('tauri_plugin_single_instance::init')
$dlgIdx = $rs.IndexOf('tauri_plugin_dialog::init')
Assert 'main.rs: single-instance registered first' ($siIdx -ge 0 -and ($dlgIdx -lt 0 -or $siIdx -lt $dlgIdx)) 'single-instance should be the first .plugin()'

# ---- 3. command contract: defined + registered (Rust) AND invoked (JS)
$commands = @('take_launch_file', 'read_file', 'save_file', 'save_file_bytes')
foreach ($c in $commands) {
  Assert "main.rs: defines fn $c"      ($rs -match "fn\s+$c")                     'no #[tauri::command] fn'
  Assert "main.rs: registers $c"       ($rs -match "generate_handler!\[[^\]]*\b$c\b") 'missing from generate_handler!'
  Assert "index.html: invokes $c"      ($html -match "tauriInvoke\(\s*'$c'")      'frontend never calls it'
}

# ---- 4. event-name contract: Rust emit == JS listen ----------------
Assert 'main.rs: emits open-lpd'        ($rs -match 'emit\(\s*"open-lpd"')    'single-instance emit missing'
Assert 'index.html: listens open-lpd'   ($html -match "listen\(\s*'open-lpd'") 'frontend listener missing'

# ---- 5. capability + config ----------------------------------------
Assert 'capabilities: dialog:default'   ($cp.permissions -contains 'dialog:default') 'not granted'
Assert 'tauri.conf: withGlobalTauri on' ($cf.app.withGlobalTauri -eq $true)          'frontend cannot reach __TAURI__'
$exts = @(); if ($cf.bundle.fileAssociations) { $exts = $cf.bundle.fileAssociations.ext }
Assert 'tauri.conf: .lpd file association' ($exts -contains 'lpd') 'no .lpd association registered'

# ---- 6. frontend wiring present ------------------------------------
foreach ($fn in @('isDesktop', 'saveFileNative', 'triggerLoadNative', 'onSecondInstanceFile', 'listenForSecondInstance', 'exportSVGNative', 'exportPNG', 'exportPNGNative', 'svgToPngBlob', 'initMenubar', 'initAccessibility')) {
  Assert "index.html: function $fn" ($html -match "function\s+$fn\b") 'helper not defined'
}
Assert 'index.html: a11y init wired'        ($html -match 'initAccessibility\(\);')        'initAccessibility not called in init'
Assert 'index.html: click-to-open menus'    ($html -match '\.m-item\.open \.m-drop')       'menus still hover-only'
Assert 'index.html: confirm-alt button'     ($html -match 'id="confirm-alt"')              '3-way dialog button missing'
Assert 'index.html: PNG DPI submenu'        ($html -match 'onclick="exportPNG\(300\)"')    'Export PNG DPI choices missing'
Assert 'index.html: exportSVG desktop branch' ($html -match 'if\(isDesktop\(\)\)\{ await exportSVGNative\(') 'SVG export not routed through native save'
Assert 'index.html: exportPNG desktop branch' ($html -match 'if\(isDesktop\(\)\)\{ await exportPNGNative\(') 'PNG export not routed through native save'
Assert 'index.html: S.nativePath field'        ($html -match 'nativePath:')              'state field missing'
Assert 'index.html: saveFile desktop branch'   ($html -match 'if\(isDesktop\(\)\)\{ await saveFileNative\(false\)') 'saveFile not routed'
Assert 'index.html: saveFileAs desktop branch' ($html -match 'if\(isDesktop\(\)\)\{ await saveFileNative\(true\)')  'saveFileAs not routed'
Assert 'index.html: triggerLoad desktop branch'($html -match 'if\(isDesktop\(\)\)\{ await triggerLoadNative\(\)')   'triggerLoad not routed'
Assert 'index.html: listenForSecondInstance wired' ($html -match 'listenForSecondInstance\(\);') 'not called in init'

# ---- 6b. auto-update wiring (tauri-plugin-updater + process) --------
Assert 'Cargo: tauri-plugin-updater dep'    ($cg -match 'tauri-plugin-updater') 'not in Cargo.toml'
Assert 'Cargo: tauri-plugin-process dep'    ($cg -match 'tauri-plugin-process') 'not in Cargo.toml'
Assert 'Cargo: serde_json dep'              ($cg -match '(?m)^serde_json\s*=') 'updater config needs serde_json in generate_context!'
Assert 'main.rs: updater plugin init'       ($rs -match 'tauri_plugin_updater::Builder') 'no updater .plugin()'
Assert 'main.rs: process plugin init'       ($rs -match 'tauri_plugin_process::init') 'no process .plugin()'
Assert 'capabilities: updater:default'      ($cp.permissions -contains 'updater:default') 'not granted'
Assert 'capabilities: process:default'      ($cp.permissions -contains 'process:default') 'not granted'
Assert 'tauri.conf: createUpdaterArtifacts' ($cf.bundle.createUpdaterArtifacts -eq $true) 'not enabled'
$eps = @(); if ($cf.plugins -and $cf.plugins.updater) { $eps = @($cf.plugins.updater.endpoints) }
Assert 'tauri.conf: updater endpoint set'   (@($eps | Where-Object { $_ -match 'releases/latest/download/latest\.json' }).Count -ge 1) 'no GitHub latest.json endpoint'
Assert 'tauri.conf: updater pubkey set'     ($cf.plugins.updater.pubkey -and "$($cf.plugins.updater.pubkey)".Length -gt 40) 'pubkey missing/short'
Assert 'index.html: checkForUpdates fn'     ($html -match 'function\s+checkForUpdates\b') 'helper not defined'
Assert 'index.html: Check for Updates menu' ($html -match 'id="mi-update"') 'menu item missing'
Assert 'index.html: uses updater global'    ($html -match '__TAURI__\.updater') 'never reads the updater API'
Assert 'index.html: downloadAndInstall'     ($html -match 'downloadAndInstall\(') 'never installs the update'
Assert 'index.html: relaunch after update'  ($html -match 'relaunch\(') 'never relaunches'
Assert 'index.html: silent update check on launch' ($html -match 'setTimeout\(\(\)=>checkForUpdates\(false\)') 'no on-launch auto-check'

# ---- 7. version sync -----------------------------------------------
# APP_VERSION (dev), Cargo.toml, and tauri.conf move together (the version-bump checklist bumps
# all three). build-info.json + BUILD_TAG identify the LAST PACKAGED build and legitimately lag the
# dev version between builds, so we only assert buildTag==BUILD_TAG (both are last-build IDs), not
# devVersion==APP_VERSION (that diverges during normal dev).
$appV = ([regex]::Match($html, "const APP_VERSION\s*=\s*'v?([0-9.]+)'")).Groups[1].Value
$bldT = ([regex]::Match($html, "const BUILD_TAG\s*=\s*'([^']+)'")).Groups[1].Value
$cgV  = ([regex]::Match($cg,   "(?m)^version\s*=\s*`"([0-9.]+)`"")).Groups[1].Value
$cfV  = "$($cf.version)"
Assert 'version: index.html APP_VERSION parsed' ($appV -ne '') 'could not read APP_VERSION'
Assert 'version: Cargo.toml == APP_VERSION'     ($cgV -eq $appV) "Cargo=$cgV vs app=$appV"
Assert 'version: tauri.conf == APP_VERSION'     ($cfV -eq $appV) "conf=$cfV vs app=$appV"
Assert 'build-info: buildTag == BUILD_TAG'      ("$($bi.buildTag)" -eq $bldT)   "ledger=$($bi.buildTag) vs html=$bldT"

# ---- 8. build currency (INFORMATIONAL — not a pass/fail) -----------
# Whether the packaged exe is current with the sources. Expected to be stale during normal dev
# (you edit index.html, the exe lags until the next /build), so this is a note, not an assertion.
$exe = Join-Path $tauriSr 'target\release\leather-pattern-designer.exe'
if (Test-Path $exe) {
  $exeT  = (Get-Item $exe).LastWriteTime
  $srcT  = @($mainRs, $index, $cargo, $conf) | ForEach-Object { (Get-Item $_).LastWriteTime } | Sort-Object | Select-Object -Last 1
  if ($exeT -ge $srcT) { $script:buildNote = "exe is current (built $exeT)" }
  else { $script:buildNote = "exe is STALE vs sources (built $exeT, newest src $srcT) - /build to refresh" }
} else {
  $script:buildNote = "no packaged exe yet - run /build"
}

# ---- 9. optional: actually compile ---------------------------------
if ($Compile) {
  Push-Location $tauriSr
  try {
    & cargo check --quiet 2>&1 | Out-Null
    Assert 'cargo check (compiles)' ($LASTEXITCODE -eq 0) "cargo check exit $LASTEXITCODE"
  } finally { Pop-Location }
}

# ---- report (same shape as run-smoke.ps1) --------------------------
Write-Host ""
Write-Host "  Leather Pattern Designer - DESKTOP build smoke" -ForegroundColor Cyan
Write-Host "  ----------------------------------------------------"
$pass = 0; $fail = 0
foreach ($r in $script:results) {
  if ($r.pass) { Write-Host ("  PASS  " + $r.name) -ForegroundColor Green; $pass++ }
  else {
    $line = "  FAIL  " + $r.name
    if ($r.detail) { $line += "  ($($r.detail))" }
    Write-Host $line -ForegroundColor Red; $fail++
  }
}
Write-Host "  ----------------------------------------------------"
$total = $pass + $fail
$color = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host ("  {0}/{1} passed, {2} failed" -f $pass, $total, $fail) -ForegroundColor $color
if ($script:buildNote) { Write-Host ("  build: " + $script:buildNote) -ForegroundColor DarkGray }
Write-Host ""
exit ([int]($fail -ne 0))
