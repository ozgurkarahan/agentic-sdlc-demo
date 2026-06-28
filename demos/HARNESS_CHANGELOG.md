# Harness Changelog — loop-memory (what we tested · what broke · what we fixed)

> **Append-only.** This is the don't-redo-it memory mandated by the human (2026-06-28). Each scenario we
> push through the harness gets a section: which agents we exercised, whether each behaved as expected, any
> **harness defect** found, and the **fix applied**. Methodology = `HARNESS_TESTING.md`. Session ledger
> mirror = `files/validation-log.md` (L13+). The frozen story/contract = `CONTRACT.md`.

Legend: ✅ behaved as expected · 🔧 defect found → fixed · ⏳ not yet exercised · ⛔ KNOWN-DEFECT (≤3 tries) ·
`—` not stressed by this scenario.

---

## Agent × scenario matrix (high-level)

| Agent / gate | S1 rate-limit | S2 input-validation | S3 risky-dep | S4 docs/scope | S5 malformed-plans |
|---|---|---|---|---|---|
| Planning | ✅ | ✅ | ✅ | — | ✅ |
| Rubber-Duck | ✅ | — | — | — | ✅ |
| Dispatcher / Orchestrator | ✅ | — | — | — | ✅ |
| Dev-fleet (path-scope) | ✅ | ⏳ (live) | — | ✅ | — |
| Dev-fleet (trajectory) | ✅ | ⏳ (live) | — | ✅ | — |
| Quality-Test (eval-rubric) | ✅ | ✅ | — | — | — |
| Security (pin/slopsquat) | ✅ | — | ✅ | — | — |
| Code-Review (doc-coupling) | ✅ | — | — | ✅ | — |
| Deployment (smoke/rollback) | ✅ | ⏳ (live capstone) | — | — | — |

---

## Loop 1 — S1 "Add rate limiting" (baseline, COMPLETE)

All 9 gates proven good-path + bad-path, T1 deterministic (19/19, 10/10 negatives) **and** live on
`ozgurkarahan/agentic-sdlc-demo-live` (criteria #1–#10, ledger L1–L12). Headline: the harness-authored live
E2E caught a **real** architectural defect (in-app per-IP limiter can't enforce behind ACA ingress) →
KNOWN-DEFECT, live issue #21. No harness theater found. This is the reference all Loop-2 scenarios must not
regress.

---

## Loop 2 — Harness Generalization & Stress (ACTIVE, started 2026-06-28)

### Phase 0 — scenario-axis generalization (the enabling refactor) — ✅ DONE

**What we tested:** can a *second* scenario run without editing the validator/runner? (No — the harness was
mono-scenario.) **Defect class:** S1-coupling baked into shared gates.

**Defects found → fixes applied:**

| # | Defect (S1 hardcoding) | Fix | Verified |
|---|---|---|---|
| P0-1 | `eval-rubric.mjs` literally asserted `429`/`Retry-After`/threshold — no second acceptance contract could run. | Extracted the burst-threshold oracle into `ci/scripts/rubrics/rate-limit.mjs`; rewrote `eval-rubric.mjs` as a **generic** runner that loads a `--rubric <module>` and trusts the rubric's own `{checks,signals,pass}`. Default rubric = rate-limit, so the `tests-and-evals.yml` CI caller is unchanged. | default-rubric CLI (no `--rubric`) → PASS 3/3, exit 0 |
| P0-2 | Validator `eval-rubric` driver hard-coded an S1 `variantMap{good,no-429,missing-retry-after}` + interpreted signals itself. | Rewrote `validate/run.mjs` to be **scenario-aware**: it loads the scenario's declared `rubric.mjs` + the variant named by the fixture, and trusts the rubric's emitted `signals`. The validator now has **zero** 429 knowledge. | full run + `--scenario s1` both 19/19 |
| P0-3 | Fixtures lived flat at `fixtures/<agent>/` — no scenario axis. | Introduced `demos/scenarios/<id>/{scenario.json,rubric.mjs,variants/,fixtures/<agent>/}`; migrated all 24 S1 fixtures + 3 variants via `git mv` into `scenarios/s1-rate-limit/`. Validator discovers scenarios by scanning `scenarios/*/fixtures/**`. | `--scenario s1` resolves; unknown id → exit 2 with known-scenario list |
| P0-4 | `CONTRACT.md` §3/§4 described the old flat layout. | Added §10 (scenario axis) + pointers at §3/§4 — **additive**, S1 story unchanged. | doc review |

**Agent-by-agent (S1 re-validated after the refactor — the regression guard):** Planning ✅, Rubber-Duck ✅,
Dispatcher ✅, Dev-fleet path-scope ✅, Dev-fleet trajectory ✅, Quality-Test ✅, Security ✅, Code-Review ✅,
Deployment ✅ — **19/19 fixtures correct, 10/10 negatives caught, exit 0** after the generalization. No agent
regressed. Backward-compat: the no-`--rubric` CI path still passes.

**Net result:** the harness is now scenario-parameterized — a new scenario is a folder, not a code edit.
Loop-2 success criterion "no S1 hardcoding remains in the shared gates" is **met for the eval axis**;
remaining axes (deploy E2E file) generalize when the live capstone (S2) needs them.

### Phase 1 — scenario S2 input-validation (HTTP 400) — ✅ DONE (deterministic)

**Intent under test:** "Reject over-long URLs on `POST /shorten` with **400 + JSON error**, don't store garbage."
**Why this scenario:** it is the headline generalization probe — a **non-429 acceptance oracle**. If the
Phase-0 refactor were incomplete, the eval gate would still be 429-baked and S2 could not run at all.

**New oracle KIND added:** `demos/ci/scripts/rubrics/request-contract.mjs` —
`makeRequestContractRubric({kind, defaults, env, cases})`. This is the **second** oracle alongside
`rate-limit.mjs`, proving the runner accepts *any* rubric that exports `{meta, evaluate}`. S2's
`rubric.mjs` declares two cases: `valid-url` (expect 201 + code) and `overlong-url` (expect 400 + JSON
error body), threshold via `MAX_URL_LEN` (default 2048).

**What we tested, agent by agent:**

| Agent | Fixture(s) | Expected | Observed (live run) | Verdict |
|-------|-----------|----------|---------------------|---------|
| **quality-test** (eval-rubric) | `good` | pass 3/3, no signals | valid→201, overlong→400(JSON) → **pass 3/3** | ✅ behaves as expected |
| **quality-test** | `no-maxlen` (negative) | blocked, signal `overlong-url-not-rejected` | valid→201, overlong→**201** (garbage stored) → fail 1/3, signals `overlong-url-not-rejected, overlong-error-not-json` | ✅ caught (right reason) |
| **quality-test** | `plaintext-error` (negative) | blocked, signal `overlong-error-not-json` only | valid→201, overlong→**400** but non-JSON body → fail 2/3, signal `overlong-error-not-json` | ✅ caught (right reason) |
| **planning** (plan-lint) | `positive` (validation plan, U4 dependsOn U1,U2) | pass | DAG sound, ordered unit marked ordered → **pass** | ✅ content-general (no 429 knowledge) |

**Sharp discrimination proven (anti-theater):** the `plaintext-error` variant returns the **correct status
(400)** yet is **still caught** — failing *only* `overlong-error-is-json`. This proves the oracle checks
response **shape/contract**, not merely the HTTP code. A weaker oracle would have passed it.

**Harness defects found:** none. The Phase-0 generalization held — S2 ran with **zero edits** to
`run.mjs` or `eval-rubric.mjs`; the only new code is the per-scenario folder (`scenarios/s2-input-validation/`)
+ the reusable request-contract oracle.

**Regression guard:** full suite `node demos/validate/run.mjs` → **23/23 fixtures correct (19 S1 + 4 S2),
negatives caught 12/12 (10 S1 + 2 S2), exit 0.** S1 stayed green; two different oracle kinds now run through
one validator.

**Loop-2 criterion status:** "harness is better" for the eval axis is **confirmed by a real second
scenario**, not just by refactor inspection.


### Phase 2 — scenario S3 risky-dependency — ✅ DONE (deterministic)

**Intent under test:** "Add a slug-collision helper library so generated slugs don't clash" — a PR that
pulls a risky dependency.
**Why this scenario:** prove the supply-chain **pin/slopsquat** gate (`pin-check.mjs`) is **content-general**
— it must catch a *different* dependency set than S1's (which used `expresss`/`axioss`/`left-pad:*`),
with no S1-specific allowlist.

**What we tested, agent by agent:**

| Agent | Fixture | Expected | Observed (live run) | Verdict |
|-------|---------|----------|---------------------|---------|
| **security-compliance** (pin-check) | `positive-pinned-slug` | pass | `nanoid ^5.0.7` resolved by a committed lockfile → 0 findings → pass | ✅ |
| **security-compliance** | `negative-slopsquat-slug` | blocked, `slopsquat`+`mutable` | `uuidd` (typo of `uuid`) + `slugify:latest` + git-source dep → findings `slopsquat,mutable,no-lockfile,unpinned` → blocked | ✅ caught |
| **security-compliance** | `negative-unpinned` | blocked, `unpinned` | legit names, caret ranges, no lockfile → findings `no-lockfile,unpinned` → blocked | ✅ caught (different path) |
| **planning** (plan-lint) | `positive` (slug-helper plan, U4 dependsOn U1,U2) | pass | DAG sound, ordered unit marked ordered → pass | ✅ content-general |

**Two distinct negative paths exercised:** the slopsquat-negative bites on a **typosquatted name + mutable
spec**; the unpinned-negative bites on **pinning hygiene alone** (no typo) — proving the gate has more than
one real failure mode and neither is S1-specific.

**Harness defects found:** none. `pin-check.mjs` carries a generic well-known/denylist + Levenshtein-1 +
spec-classification, so a never-before-seen slug-helper dep set is caught with **zero edits**. The only new
artifacts are S3's scenario folder + data manifests.

**Regression guard:** full `node demos/validate/run.mjs` → **27/27 fixtures correct (19 S1 + 4 S2 + 4 S3),
exit 0.** S1 + S2 unchanged.

**Loop-2 criterion status:** "no S1 hardcoding remains" confirmed for the **security axis** by a real
risky-dependency scenario.


### Phase 3 — scenario S4 docs/refactor + scope — ✅ DONE (deterministic)

**Intent under test:** "Add a richer `/healthz` readiness payload (uptime + store size) and document it."
**Why this scenario:** prove the **content-general** rule *"arch changed ⇒ docs+test expected; stay in your
lane"* holds for a feature with **nothing to do with rate limiting**. Stresses three gates not deeply
re-tested by S2/S3: code-review/doc-coupling, dev-fleet/path-scope, dev-fleet/trajectory.

**What we tested, agent by agent:**

| Agent | Fixture | Expected | Observed | Verdict |
|-------|---------|----------|----------|---------|
| **code-review** (doc-coupling) | `positive-docs-updated` | pass | app.ts+health.ts+README → arch changed *with* docs → clear | ✅ |
| **code-review** | `negative-missing-docs` | blocked, `missing-doc-update` | app.ts+health.ts, no docs → flagged | ✅ caught (advisory) |
| **dev-fleet** (path-scope) | `positive-in-lane` | pass | app.ts+health.ts+e2e all inside declared lane → green | ✅ |
| **dev-fleet** | `negative-stray` | blocked, `path-violation` | strays into `src/store.ts` (another unit) → RED | ✅ caught |
| **dev-fleet** (trajectory) | `trajectory-positive` | pass | touched declared + added e2e test → green | ✅ |
| **dev-fleet** | `trajectory-negative-no-test` | blocked, `missing-required-test` | shipped change, no test → RED | ✅ caught |

**Key generalization proof:** the doc-coupling arch-glob (`**/src/app.ts`) and the path-scope/trajectory
lane logic are driven entirely by the fixture's declared paths — they fired correctly on `/healthz` content
(`health.ts`, `store.ts`, `healthz.e2e.test.ts`) that never appears in S1. No rate-limit strings anywhere.

**Harness defects found:** none. Zero edits to any check script or the validator.

**Regression guard:** full `node demos/validate/run.mjs` → **33/33 fixtures correct (19 S1 + 4 S2 + 4 S3 +
6 S4), 17 negatives caught, exit 0.** All prior scenarios unchanged.

**Loop-2 criterion status:** "no S1 hardcoding remains" confirmed for the **review / path-scope /
trajectory axes**.


### Phase 4 — scenario S5 malformed plans (orchestrator) — ✅ DONE (deterministic)

**Intent under test:** feed the orchestrator four classically-broken plans + the approval gate, and prove
each is caught. **Why this scenario:** cheap pure-structural breadth — it proves the dispatcher's guards
reason about **DAG shape**, not about rate limiting. It also fills the biggest orchestrator coverage gap:
S1's rubber-duck fixture only trips plan-lint rules **B+C**; it never exercised `validatePlan`'s structural
detection (cycle, duplicate-id) or rule **A** in isolation.

**What we tested, agent by agent (orchestrator family — Planning artifact contract, Rubber-Duck gate,
Dispatcher):**

| Driver | Fixture | Expected | Observed | Verdict |
|--------|---------|----------|----------|---------|
| `plan-lint` | `positive-sound-plan` | pass, no signals | unique ids · acyclic · parallel units own distinct paths · integration unit correctly ordered → clean | ✅ |
| `plan-lint` | `negative-cycle` | blocked, `malformed-plan` | U1→U3→U2→U1 → `validatePlan` cycle detector throws | ✅ caught |
| `plan-lint` | `negative-dup-id` | blocked, `malformed-plan` | two units id `U1` → duplicate-id guard throws | ✅ caught |
| `plan-lint` | `negative-ordered-marked-parallel` | blocked, `ordered-unit-marked-parallel` | dependent unit marked `parallelSafe:true` → rule A | ✅ caught |
| `plan-lint` | `negative-parallel-share-path` | blocked, `parallel-units-share-path` | two `parallelSafe:true` units claim the same file → rule B | ✅ caught |
| `dispatch` | `dispatch-positive-approved` | pass, `dispatched` | approved sound plan fans out U1–U3, holds ordered U4 | ✅ |
| `dispatch` | `dispatch-negative-unapproved` | blocked, `refused-unapproved` | no `plan-approved` label → dispatcher refuses fan-out | ✅ caught |

**Key generalization proof:** all five guards fired on a **slug-collision** plan (paths like `src/lib/slug.ts`,
`slug.e2e.test.ts`) — nothing rate-limit-specific. `validatePlan`/`decideDispatch` reason purely about ids,
edges, parallel flags, and owned paths, so they are content-general by construction.

**Harness defects found:** none. Zero edits to `plan-lint.mjs`, `dispatch.mjs`, or the validator.

**Regression guard:** full `node demos/validate/run.mjs` → **40/40 fixtures correct (19 S1 + 4 S2 + 4 S3 +
6 S4 + 7 S5), 22 negatives caught, exit 0.** All prior scenarios unchanged.

**Loop-2 criterion status:** "no S1 hardcoding remains" confirmed for the **orchestrator axis**
(Planning structural contract + Rubber-Duck parallelization rules + Dispatcher approval/wave logic).


### Phase 5 — S2 live capstone (Azure + @copilot) — 🚧 IN PROGRESS

**Sub-step 5a — generalize `deploy.yml` live-E2E gate (source, local-only) — ✅ DONE.**
The last remaining S1-hardcoding in the harness lived in the live deployment gate: `deploy.yml` named the
single file `test/e2e/rateLimit.e2e.test.ts` and injected `RATE_LIMIT_MAX: '50'` as a workflow constant.
Generalized so **no scenario constant lives in the YAML**:
- The gate now **discovers** `test/e2e/*.e2e.test.ts` (fails if none — Planning still mandates a real-results
  E2E unit) and runs the whole `test/e2e` dir against the live staging URL.
- Any acceptance threshold the active scenario needs is **scenario-declared** in a committed, optional
  `test/e2e/e2e.env` (`KEY=VALUE` lines), sourced at run time — S1 ships `RATE_LIMIT_MAX=50`, S2 ships
  `MAX_URL_LEN=2048`. A fully self-configuring test needs none.
- The **anti-theater skip-guard** (a skipped/empty suite ≠ green; `passed<1` ⇒ refuse promotion) is retained.
- Validated: `deploy.yml` still parses as valid YAML; the only residual `RATE_LIMIT` strings are illustrative
  comments. This satisfies L2-generalization item #4 (the deploy live-E2E gate is now feature-agnostic).

**Sub-step 5b — drive the 400-validation feature LIVE (Azure + @copilot) — 🚧 next.**
Pre-flight liveness confirmed (2026-06-28): `agentic-sdlc-demo-live` up (PUBLIC, `master`); both Container
Apps **Running** and serving `/healthz` → `200 {"status":"ok"}` (staging + prod). Loop-1 S1 issues intact
(#5 intake, #6 PRD plan-approved, #11 U4, #21 KNOWN-DEFECT). Next: instantiate the generalized `deploy.yml`
+ S2 `e2e.env` into the live repo, file the S2 intent issue, drive planning → @copilot dev-fleet → PR gates
(the **generalized eval-rubric** scoring 400+JSON live) → merge → live deploy + the generalized E2E gate.

