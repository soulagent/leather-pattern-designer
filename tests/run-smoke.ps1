# ════════════════════════════════════════════════════════════════════
#  run-smoke.ps1  —  Leather Pattern Designer smoke-test runner
#
#  Injects tests/smoke-harness.js into a copy of index.html, runs it in
#  headless Edge, reads the JSON results back out of the DOM, and prints
#  a PASS/FAIL report. Exit code 0 = all passed, 1 = a test failed.
#
#  Usage:  powershell -File tests\run-smoke.ps1 -Tier quick
#          powershell -File tests\run-smoke.ps1 -Tier full
# ════════════════════════════════════════════════════════════════════
param(
  [string]$Tier = 'quick',
  [string]$Feature = ''
)
# A feature list (if given) overrides the tier. Passed straight to the harness,
# which resolves both tier names ('quick'/'full') and comma/space feature lists.
# Available features: core history saveload page color snap
#   stitch-rect peredge stitch-circle stitch-path stitch-guard bbox
$Spec = if ($Feature) { $Feature } else { $Tier }

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot          # project root (parent of tests\)
$index = Join-Path $root 'index.html'
$harness = Join-Path $PSScriptRoot 'smoke-harness.js'
$tmp = Join-Path $PSScriptRoot '_run.html'

if (-not (Test-Path $index)) { Write-Error "index.html not found at $index"; exit 2 }
if (-not (Test-Path $harness)) { Write-Error "smoke-harness.js not found at $harness"; exit 2 }

# Locate Edge
$edge = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error "Microsoft Edge not found."; exit 2 }

# Build the instrumented page: index.html + harness + invocation, before </body>
$html = Get-Content $index -Raw -Encoding UTF8
$js = Get-Content $harness -Raw -Encoding UTF8
$inject = "<script>`n$js`nwindow.__SMOKE__('$Spec');`n</script>`n</body>"
if ($html -notmatch '</body>') { Write-Error "No </body> in index.html"; exit 2 }
$instrumented = $html -replace '</body>', $inject
Set-Content -Path $tmp -Value $instrumented -Encoding UTF8

# Run headless Edge, dump the DOM. Use Start-Process with redirected output
# files so Edge's benign stderr warnings don't trip ErrorActionPreference=Stop.
$uri = ([System.Uri]$tmp).AbsoluteUri
$outFile = Join-Path $PSScriptRoot '_dump.out'
$errFile = Join-Path $PSScriptRoot '_dump.err'
$edgeArgs = @(
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  "--user-data-dir=$env:TEMP\lpat-smoke-profile", '--dump-dom', $uri
)
Start-Process -FilePath $edge -ArgumentList $edgeArgs -Wait -NoNewWindow `
  -RedirectStandardOutput $outFile -RedirectStandardError $errFile
$dump = if (Test-Path $outFile) { Get-Content $outFile -Raw -Encoding UTF8 } else { '' }

Remove-Item $tmp, $outFile, $errFile -Force -ErrorAction SilentlyContinue

# Extract the JSON payload
$m = [regex]::Match($dump, '__SMOKE_JSON__(?<j>.*?)__END__', 'Singleline')
if (-not $m.Success) {
  Write-Host "FATAL: smoke harness produced no output (page failed to run)." -ForegroundColor Red
  Write-Host "--- first 600 chars of DOM dump ---"
  Write-Host ($dump.Substring(0, [Math]::Min(600, $dump.Length)))
  exit 1
}

$data = $m.Groups['j'].Value | ConvertFrom-Json

# Report
Write-Host ""
Write-Host "  Leather Pattern Designer - smoke test [$($data.tier)]" -ForegroundColor Cyan
Write-Host "  ----------------------------------------------------"
foreach ($r in $data.results) {
  if ($r.pass) {
    Write-Host ("  PASS  " + $r.name) -ForegroundColor Green
  }
  else {
    $line = "  FAIL  " + $r.name
    if ($r.detail) { $line += "  ($($r.detail))" }
    Write-Host $line -ForegroundColor Red
  }
}
Write-Host "  ----------------------------------------------------"
$color = if ($data.failed -eq 0) { 'Green' } else { 'Red' }
Write-Host ("  {0}/{1} passed, {2} failed" -f $data.passed, $data.total, $data.failed) -ForegroundColor $color
if ($data.aborted) {
  Write-Host "  HARNESS ABORTED:" -ForegroundColor Red
  Write-Host ("  " + $data.aborted)
}
Write-Host ""

exit ([int]($data.failed -ne 0))
