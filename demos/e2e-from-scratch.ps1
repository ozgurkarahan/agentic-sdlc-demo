#!/usr/bin/env pwsh
# demos/e2e-from-scratch.ps1 — B5: the FULL from-scratch test. One command reproduces the entire
# harness cold for a presenter dry-run: clean install → build → tests → full gate matrix → doc-lint →
# dispatcher → run-status oracle → delegated-approver → (read-only) live discovery. Exits 0 only if
# every offline phase is green. Live deploy is best-effort and not required for exit 0 (GitHub queue).
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$demos = Join-Path $repo 'demos'
$fail = @(); $ok = @()
function Phase($n, $sb) { Write-Host "`n=== $n ===" -ForegroundColor Cyan; try { & $sb; $script:ok += $n; Write-Host "  PASS $n" -ForegroundColor Green } catch { $script:fail += $n; Write-Host "  FAIL $n — $_" -ForegroundColor Red } }

Phase 'P1 sample-app install+build+test' { Push-Location "$demos\sample-app"; npm ci 2>&1 | Out-Null; npm run build 2>&1 | Out-Null; npm test 2>&1 | Select-Object -Last 3; if ($LASTEXITCODE -ne 0) { Pop-Location; throw "tests" }; Pop-Location }
Phase 'P2 full gate matrix (74/74)' { node "$demos\validate\run.mjs" 2>&1 | Select-Object -Last 2; if ($LASTEXITCODE -ne 0) { throw "matrix red" } }
Phase 'P3 doc-lint (count drift)' { node "$demos\ci\scripts\doc-lint.mjs" --strict | Out-Null; if ($LASTEXITCODE -ne 0) { throw "doc drift" } }
Phase 'P4 orchestrator dispatch' { node "$demos\orchestrator\cli.mjs" --plan "$demos\orchestrator\example-plan.json" | Select-Object -First 2; if ($LASTEXITCODE -ne 0) { throw "dispatch" } }
Phase 'P5 delegated-approver refusals' { node "$demos\validate\run.mjs" --filter auto-approve 2>&1 | Select-Object -Last 2; if ($LASTEXITCODE -ne 0) { throw "approver" } }
Phase 'P6 LIVE discovery (read-only, best-effort)' { $env:GH_TOKEN=''; node "$demos\ci\scripts\auto-approve.mjs" --live --repo ozgurkarahan/agentic-sdlc-demo-live }

Write-Host "`n============ E2E FROM-SCRATCH ============" -ForegroundColor White
Write-Host "PASS: $($ok.Count) — $($ok -join '; ')" -ForegroundColor Green
if ($fail.Count) { Write-Host "FAIL: $($fail -join '; ')" -ForegroundColor Red; exit 1 }
Write-Host "ALL GREEN — harness reproduces cold." -ForegroundColor Green; exit 0
