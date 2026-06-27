# `DEMO_SCRIPT.md` — presenter golden path

> The **one story**, threaded through **every** agent/gate, with the exact command to run at each stage,
> the artifact it produces, and the **adversarial negative** to show being *caught*. Tier-1 is fully
> runnable offline; Tier-2/Tier-3 callouts mark what needs a real GitHub repo.
>
> **The whole thing in one command:** `node demos/validate/run.mjs` runs every gate below and exits
> non-zero if any negative slips through. The acts below let you narrate it stage by stage.

## The story (frozen)
> *"Add rate limiting to the URL-shortener API so a single client can't exhaust the service."*

Decomposes into **U1** limiter middleware ‖ **U2** config surface ‖ **U3** docs (all parallel-safe) and
**U4** integration test (ordered — `dependsOn: [U1, U2]`).

## Honesty legend
🟩 native GitHub · 🟦 our CI job / local assertion · 🟨 advisory (non-blocking) · ⛔ external (coding-agent / human).
The dispatcher's plan-approved gate is **layered orchestration, never native pre-code enforcement.**

## Pre-flight (once)
```bash
npm --prefix demos/sample-app ci
npm --prefix demos/sample-app run build
npm --prefix demos/sample-app test     # 15 unit+e2e tests green — the "before" app works (no limiting yet)
```

---

## Act 0 — Intent
**Say:** a single product intent arrives. Everything downstream is traceable to it.
**Artifact:** [`orchestrator/example-plan.json`](./orchestrator/example-plan.json) `.intent`.

## Act 1 — Planning (🟦 local assertion)
**Say:** the planner decomposes the intent into a DAG; the dependent integration unit must be marked
**ordered**, not parallel.
**Run:**
```bash
node demos/validate/run.mjs --filter planning
```
**Show:** the positive plan passes; the **negative** — an inherently-ordered unit (Redis store → limiter)
mislabeled `parallelSafe: true` — is **caught** (`ordered-unit-marked-parallel`).

## Act 2 — Rubber-Duck gate (🟦 local assertion)
**Say:** before any code, a devil's-advocate pass stress-tests the plan.
**Run:**
```bash
node demos/ci/scripts/plan-lint.mjs --input demos/fixtures/rubber-duck/negative-hidden-dependency.json
node demos/validate/run.mjs --filter rubber-duck
```
**Show:** the flawed plan (two "parallel-safe" units secretly share a limiter store **and** the
integration test is mislabeled parallel) is **caught** on two signals
(`parallel-units-share-path`, `integration-marked-parallel`). The corrected plan passes.

## Act 3 — Human approval ⛔ (native in T2)
**Say:** a human applies the **`plan-approved`** label. GitHub does not enforce "plan approval" — this is
a human gate the dispatcher *chooses* to honour. *(T1: informational; T2: a label-conditioned workflow.)*

## Act 4 — Dispatch / fan-out (🟦 orchestration, NOT native)
**Say:** the dispatcher fans out only the **approved** plan, sends the 3 parallel-safe units as one wave,
and **holds U4** until U1+U2 land.
**Run:**
```bash
node demos/orchestrator/cli.mjs --plan demos/orchestrator/example-plan.json          # dispatch U1,U2,U3 · hold U4
node demos/orchestrator/cli.mjs --plan demos/orchestrator/example-plan.json --landed U1,U2,U3   # now U4 dispatches
node demos/validate/run.mjs --filter orchestrator
```
**Show:** the wave decision; then the **negative** — an unapproved plan → the dispatcher **refuses to
fan out anything** (`refused-unapproved`, exit 1). *(In T3, add `--assign --repo … --issues …` to assign
each unit's issue to `@copilot`. ⛔)*

## Act 5 — Dev fleet ×3 (🟦 required CI job)
**Say:** three dev agents open three PRs, each scoped to its unit. Two custom checks keep them honest.
**Run:**
```bash
node demos/validate/run.mjs --filter dev-fleet
```
**Show:** **path-scope** — a PR straying into another unit's file (`src/config.ts`) is **caught**
(`path-violation`); **trajectory** — a PR that ships the feature but **no test** is **caught**
(`missing-required-test`). The in-lane, test-included PRs pass.

## Act 6 — Quality / Test evals (🟦 required CI job)
**Say:** tests alone aren't enough — an **output rubric** grades real behaviour (429 at the threshold +
a numeric `Retry-After`).
**Run:**
```bash
node demos/ci/scripts/eval-rubric.mjs --app demos/sample-app/dist/app.js \
  --variant demos/fixtures/quality-test/good.mjs               # PASS 3/3
node demos/ci/scripts/eval-rubric.mjs --app demos/sample-app/dist/app.js \
  --variant demos/fixtures/quality-test/no-429.mjs             # FAIL — limits nothing
node demos/validate/run.mjs --filter quality-test
```
**Show:** the good limiter scores 3/3; the **no-429** impl (passes unit tests, limits nothing) and the
**missing-Retry-After** impl both turn the evals gate **RED**.

## Act 7 — Security / Compliance (🟦 custom job + 🟩 GHAS in T2)
**Say:** every PR's dependencies are screened for hallucinated / unpinned packages. *(Decoupled synthetic
fixture — supply-chain risk is orthogonal to the rate-limit story.)*
**Run:**
```bash
node demos/ci/scripts/pin-check.mjs --package demos/sample-app/package.json                  # PASS
node demos/ci/scripts/pin-check.mjs --package demos/fixtures/security/bad-deps-package.json   # FAIL
node demos/validate/run.mjs --filter security-compliance
```
**Show:** the real app (caret ranges + committed lockfile = the *secure* pinning pattern) is green; the
synthetic manifest (`expresss`/`axioss` typosquats, `*`/`latest` mutable specs, no lockfile) is **caught**.
*(In T2, CodeQL + dependency-review add the 🟩 native half over the injectable sink.)*

## Act 8 — Code Review (🟨 advisory; 🟩 CODEOWNERS blocks in T2)
**Say:** the reviewer flags architecture changes that ship without docs — advisory, not a hard block.
**Run:**
```bash
node demos/validate/run.mjs --filter code-review
```
**Show:** an arch change to `app.ts` with **no docs update** is **flagged** (`missing-doc-update`); the
docs-updated PR is clear. The *merge* block in T2 is a required **CODEOWNERS** review.

## Act 9 — Human approves PRs ⛔ (native in T2)
**Say:** required reviewers approve. *(T2: ruleset-required review + CODEOWNERS.)*

## Act 10 — Merge queue (🟩 native, T2)
**Say:** the merge queue integrates the parallel PRs in order; once U1+U2 land, **U4** (integration test)
now runs. *(Native GitHub; demonstrated in the T2 instance.)*

## Act 11 — Deployment (🟦 local harness; 🟩 Environment in T2)
**Say:** deploy → smoke → go/no-go, with rollback on a bad build.
**Run:**
```bash
node demos/validate/run.mjs --filter deployment
```
**Show:** a healthy build smokes green → **go**; a build with a broken `/healthz`
(`break-healthz.mjs`) → **no-go + rollback** (`rollback`, `no-go`).

## Act 12 — Human approves release ⛔ (Environment reviewer, T2)

## Act 13 — Traceability
**Say:** the whole chain is auditable end to end:
> intent → tracking issue → child issues → plan + `plan-approved` label → 3 branches/PRs →
> checks + evals + security + review → human approvals → merge queue → integration test → deployment
> history.

---

## The finale — one command runs the entire matrix
```bash
node demos/validate/run.mjs
```
**Show:** 19/19 fixtures correct, **10/10 negatives caught**, exit 0 — each row labelled by enforcement
type. If any gate were theater, this exits 1 and names the offender.

```
✅ ALL GREEN  19/19 fixtures correct
negatives caught (anti-theater): 10/10
```

## Running Tiers 2 & 3 (callouts)
- **Tier-2 (enforced repo, D7):** instantiate the harness into a **dedicated** repo (sample-app at root +
  `ci/scripts/` + `.github/workflows/` targeting `master`), trigger a first run to register check-names,
  then mark them required via rulesets; verify a deliberately-failing PR is **blocked**. Needs admin +
  `gh auth refresh -s workflow`.
- **Tier-3 (live fleet, D8):** preflight the Copilot coding agent, open the real issues, and
  `cli.mjs --assign` them to `@copilot`; watch ephemeral PRs flow through the same gates. **If the
  coding agent is unavailable, T3 ships as pre-recorded evidence under `evidence/` and is reported
  "not validated" — never silently replaced by an in-CI LM step.**

## Presenter timing (T1, offline)
| Segment | Command | ~time |
|---|---|---|
| Pre-flight | `npm --prefix demos/sample-app ci && … build && … test` | 30–60s |
| Acts 1–13 narrated | per-agent `--filter` runs above | 3–5 min |
| Finale | `node demos/validate/run.mjs` | 5–15s |
