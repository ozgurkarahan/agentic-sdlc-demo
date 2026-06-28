# LOOP 4 — Durable Handoff (run-status generalization + test-mode delegated approval)

> Session-independent source of truth for Loop 4. Loop memory: `HARNESS_CHANGELOG.md`; deferred work: `HARNESS_BACKLOG.md`.

## Frozen goal (narrowed by rubber-duck GO-WITH-FIXES)
Clean the repo; build a **heavily-gated TEST-MODE delegated-approval helper** (honest — automates the owner's click,
does NOT claim human review); prove the **Loop-3 run-status gate is scenario-general** (S2–S5). Regression green
throughout; never fake green. **Deferred → L5:** new S6 auth scenario + first *attended* unattended prod-deploy capstone.

## Status — DONE (offline core), 2026-06-29
- ✅ W0 cleanup: closed #29/#30/#31/#32, branches deleted, run 28336842138 cancelled; #21–#28/#33 untouched.
- ✅ W1 delegated approver: `ci/lib/approval.mjs` (pure) + `ci/scripts/auto-approve.mjs` (adapter + `--live` discovery dry-run); 12 fixtures (2 pos + 10 refusals); DRY-RUN default, live only `AUTO_APPROVE_TEST_MODE=1`; honest 🟨 label.
- ✅ W1 live smoke: dry-run discovery on real repo → 10 action_required runs, **0 pending env deployments** ⇒ the gate is bot-PR "approve and run" (use `runs/{id}/approve`, deferred L5), no approvals performed.
- ✅ W2 run-status scenario-general: S2–S5 + success/failure fixtures, zero gate edits; matrix **69/69, 42 neg, exit 0**.
- ✅ W3 close: memory + commit.

## Safety design (the load-bearing honesty)
The native gates STAY (🟩 prod reviewer + bot-PR approval). The approver is 🟨 **test-mode delegated** — logs
"no human reviewed at approval time". Preconditions (all must hold or REFUSE): repo allowlist · dispatch ledger ·
`loop4-test` label · head-SHA match · branch prefix · **refuse sensitive-file changes** (.github/workflows, infra,
deploy, auth) · budget · deadline · `HARNESS_KILL` · **dry-run default, live only `AUTO_APPROVE_TEST_MODE=1`**.

## Acceptance
`node demos/validate/run.mjs` → 69/69, 42/42. `node demos/ci/scripts/auto-approve.mjs --live --repo ozgurkarahan/agentic-sdlc-demo-live` → discovery dry-run.

## L5 backlog
S6 API-key auth scenario (offline-first); bot-PR `runs/{id}/approve` approval; first ATTENDED auto-approved prod-deploy capstone.

## L5 update (2026-06-29) — DONE
- ✅ S6 auth(401) added; eval proven status-general (74/74, 45 neg, zero gate edits) — no defect.
- ✅ Delegated-approver LIVE: decision core approved in-scope; POST approve → **403 "not a fork PR"** → KNOWN-DEFECT (no retry loop). Same-repo bot runs aren't fork-approvable + had no pending deployments → bot-run clearing is repo-config-specific (real, not a harness bug). Owner-PR green/red path already proven (Loop-3 L26). First attended prod-deploy capstone still open.
