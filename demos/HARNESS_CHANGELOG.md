# Harness Changelog — loop-memory (what we tested · what broke · what we fixed)

> **Append-only.** This is the don't-redo-it memory mandated by the human (2026-06-28). Each scenario we
> push through the harness gets a section: which agents we exercised, whether each behaved as expected, any
> **harness defect** found, and the **fix applied**. Methodology = `HARNESS_TESTING.md`. Session ledger
> mirror = `files/validation-log.md` (L13+). The frozen story/contract = `CONTRACT.md`.

Legend: ✅ behaved as expected · 🔧 defect found → fixed · 🚀 driven live (in progress) · ⏳ not yet exercised · ⛔ KNOWN-DEFECT (≤3 tries) ·
`—` not stressed by this scenario.

---

## Agent × scenario matrix (high-level)

| Agent / gate | S1 rate-limit | S2 input-validation | S3 risky-dep | S4 docs/scope | S5 malformed-plans |
|---|---|---|---|---|---|
| Planning | ✅ | ✅ (+live #23) | ✅ | — | ✅ |
| Rubber-Duck | ✅ | ✅ (live plan-lint #23) | — | — | ✅ |
| Dispatcher / Orchestrator | ✅ | ✅ (live fan-out/refusal) | — | — | ✅ |
| Dev-fleet (path-scope) | ✅ | ✅ live @copilot #27 (declaredPaths==touched) | — | ✅ | — |
| Dev-fleet (trajectory) | ✅ | ✅ live @copilot #27 (requiredTest added) | — | ✅ | — |
| Quality-Test (eval-rubric) | ✅ | ✅ (determ. L13) | — | — | — |
| Security (pin/slopsquat) | ✅ | — | ✅ | — | — |
| Code-Review (doc-coupling) | ✅ | — | — | ✅ | — |
| Deployment (smoke/rollback) | ✅ | ✅ source-general (L17); live re-run deferred | — | — | — |

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


### Phase 5 — S2 live capstone (@copilot front-half live; Azure deploy re-run deferred) — ✅ DONE

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

**Sub-step 5b — drive the S2 (400-validation) feature LIVE — front-half VALIDATED, deploy re-run deferred (honest scope).**
Pre-flight liveness confirmed (2026-06-28): `agentic-sdlc-demo-live` up (PUBLIC, `master`); both Container
Apps **Running** and serving `/healthz` → `200 {"status":"ok"}`. Loop-1 S1 issues intact.

**Real feature gap found:** the live `/shorten` already returns 400+JSON for non-http(s) URLs but enforces
**no max length** — a genuine gap for the Dev-fleet (`MAX_URL_LEN`, default 2048).

**Driven live + VALIDATED (the harness front-half generalizes to a non-429 scenario):**
- **Planning** → intake **#22** → PRD **#23** (3 units + DAG + `agentic-plan` JSON) → work-units **#24/#25/#26**.
- **Rubber-Duck** → live `plan-lint.yml` (`on: issues`) on #23 → **PASS** (well-formed DAG, safe parallelization,
  Units [U1,U2,U3]); correctly **skipped** non-plan intake #22. Plan-shape-general, not S1-specific.
- **Human plan-gate** → `plan-approved` added to #23 *after* plan-lint passed (honest gate order).
- **Dispatcher** → approved → **dispatch U1,U2; hold U3** (waits on U1); unapproved variant → **REFUSAL exit 1**.
  Wave logic + refusal generalize to the S2 DAG.
- **Dev-fleet (⛔ T3)** → dispatcher `--assign` → **@copilot assigned to #24 + #25** (verified). Authoring live;
  authorship already proven in Loop 1 (PRs #12–14 merged), here re-engaged on a 400-validation feature.

**Key finding — no harness defect (the live PR gates are already content-general):** the live
`tests-and-evals.yml` output-rubric (R5) runs the 429 scorer **only** when `.agent/unit.json` declares
`rate-limit-429`; an S2 work-unit PR declares none, so it prints "not applicable" rather than false-RED, while
**trajectory + path-scope + unit-tests + security** are feature-agnostic and DO bite on S2. No change needed.

**Deliberately deferred (recorded honestly — low marginal value, high risk):** re-running the generalized
`eval-rubric.mjs` 400-scoring and `deploy.yml` E2E gate *inside* the live repo's CI. Both are proven
**deterministically** (validator L13, 400+JSON oracle green) and **in source** (deploy.yml generalized,
committed `e5c9ef6`). A full live re-run would require migrating the scenario system into the live repo —
proving only "Actions runs node" (already shown in Loop 1) while risking the live CI/apps, violating the
keep-S1-green / apps-healthy / no-teardown guardrails. **Harness generalization = proven; only the live
re-execution of those two gates is skipped.** Ledger: L18.


---

## Per-agent report — Loop 2 consolidated (the "how we tested each agent" loop-memory)

> Agent-first view (the matrix above is scenario-first). For **each** harness agent: **how** we stressed it
> across S2–S5 (+ the live S2 drive), whether it **behaved as expected**, any **defect found**, and the
> **fix applied**. This is the don't-redo-it record the human asked for. Methodology = `HARNESS_TESTING.md`.
> Net Loop-2 outcome: **the only harness defects were the Phase-0 scenario-coupling fixes (P0-1..P0-4);
> every agent gate was already content-general and needed ZERO edits to pass a brand-new scenario.**

### 1. Planning (artifact contract + `plan-lint`)
- **Tested how:** ran the structural plan-lint on a fresh, non-429 plan in every scenario — S2 validation
  plan, S3 slug-helper plan, S5's sound plan + 4 malformed plans (cycle, dup-id, ordered-marked-parallel,
  parallel-share-path); **live** on PRD issue **#23** (`plan-lint.yml on: issues`).
- **Behaved as expected:** ✅ yes. Passed every well-formed DAG; the ordered integration unit was required to
  be marked ordered; live #23 returned PASS and correctly **skipped** the non-plan intake #22.
- **Defect found / fix:** none in the agent. (Phase-0 P0-2/P0-3 generalized the *validator around it* so a
  non-429 plan could be scored at all.)

### 2. Rubber-Duck (deterministic critic gate)
- **Tested how:** S5 drove `validatePlan`'s structural detectors directly (cycle + duplicate-id throwers,
  rule-A ordered-marked-parallel, rule-B parallel-share-path) — coverage S1 never reached; **live** plan-lint
  comment on #23.
- **Behaved as expected:** ✅ yes. Each malformed plan was caught by the right rule; the clean plan passed;
  live verdict was well-formed-DAG PASS.
- **Defect found / fix:** none. Reasons purely about ids/edges/flags/paths ⇒ content-general by construction.

### 3. Orchestrator / Dispatcher (`dispatch.mjs`, `cli.mjs`)
- **Tested how:** S5 `dispatch-positive-approved` (fan out U1–U3, hold ordered U4) + `dispatch-negative-unapproved`
  (refuse without `plan-approved`); **live** on S2 — dispatched U1,U2 / held U3, and the unapproved variant
  **REFUSED, exit 1**, then `--assign` put @copilot on #24 + #25 (verified by reading the issues back).
- **Behaved as expected:** ✅ yes, on a real S2 DAG (different unit ids/paths than S1).
- **Defect found / fix:** none this loop. (The R2 async/await-verify fix predates Loop 2; it held — assigns
  were confirmed live.)

### 4. Dev-fleet — path-scope (`path-scope` required check)
- **Tested how:** S4 `positive-in-lane` vs `negative-stray` (strays into another unit's `src/store.ts`);
  **live** the gate is wired on @copilot PRs **#27/#28**. Verified @copilot's `.agent/unit.json` `declaredPaths`
  equal the exact files each PR touches (#27 = app.ts+config.ts+test+unit.json; #28 = README+unit.json).
- **Behaved as expected:** ✅ deterministically (in-lane green, stray RED on `/healthz`) **and live by inspection**
  — declaredPaths==touched ⇒ path-scope passes by construction on a 400-validation feature.
- **Defect found / fix:** none.

### 5. Dev-fleet — trajectory (`trajectory` required check)
- **Tested how:** S4 `trajectory-positive` (touched declared paths + added e2e test) vs
  `trajectory-negative-no-test` (`missing-required-test`); **live** verified @copilot's #27 declares
  `requiredTest: test/unit/inputValidation.test.ts` and actually added that test.
- **Behaved as expected:** ✅ deterministically **and live by inspection** — the "must add the required test"
  contract is satisfied by @copilot's own PR on a non-429 feature.
- **Defect found / fix:** none.

### 6. Quality-Test (`eval-rubric`)
- **Tested how:** S2 is the headline probe — a **non-429 acceptance oracle**. Ran the new
  `request-contract.mjs` rubric: `good` (valid→201, overlong→400+JSON), `no-maxlen` (overlong stored → caught),
  `plaintext-error` (correct **400** but non-JSON body → **still caught**, shape not just status).
- **Behaved as expected:** ✅ yes, with sharp discrimination (the right-status/wrong-shape variant is the
  anti-theater proof). Live `tests-and-evals.yml` is **contract-driven (R5)** — it runs the 429 scorer only if
  `unit.json` declares `rate-limit-429`, so the S2 PR gets "not applicable" instead of a false-RED.
- **Defect found / fix:** **Phase-0 P0-1** — `eval-rubric.mjs` had the 429 oracle baked in. **Fixed:** extracted
  `rubrics/rate-limit.mjs`, made the runner load a `--rubric <module>` and trust its `{checks,signals,pass}`;
  added `rubrics/request-contract.mjs` as the second oracle. This is the single most important Loop-2 fix.

### 7. Security-Compliance (`pin-check` + CodeQL/dependency-review)
- **Tested how:** S3 risky-dependency — a **different** dep set than S1: `positive-pinned-slug` (nanoid + lockfile),
  `negative-slopsquat-slug` (`uuidd` typo + `slugify:latest` + git-source), `negative-unpinned` (legit names,
  caret ranges, no lockfile — pinning hygiene alone).
- **Behaved as expected:** ✅ yes — two distinct negative paths, neither S1-specific (generic well-known/denylist
  + Levenshtein-1 + spec-classification).
- **Defect found / fix:** none.

### 8. Code-Review (`doc-coupling` advisory + CODEOWNERS)
- **Tested how:** S4 `positive-docs-updated` vs `negative-missing-docs` — an arch change to `app.ts`/`health.ts`
  with no doc update on a `/healthz` feature (nothing to do with rate limiting).
- **Behaved as expected:** ✅ yes — the arch-glob fired on non-429 content and flagged the missing doc.
- **Defect found / fix:** none.

### 9. Deployment (`smoke-check` + rollback + live-E2E gate)
- **Tested how:** S1 proved both rollback variants live (staging-fail + prod-canary-fail) in Loop 1. Loop 2's
  job was **generalizing the live-E2E gate** so it is not S1-file-hardcoded.
- **Behaved as expected:** ✅ as **source** — `deploy.yml` now discovers `test/e2e/*.e2e.test.ts` + sources an
  optional scenario `test/e2e/e2e.env` (no threshold constant in the YAML); anti-theater skip-guard retained.
- **Defect found / fix:** **Phase-5a** — removed the hardcoded `rateLimit.e2e.test.ts` filename + `RATE_LIMIT_MAX`
  workflow constant. **Honesty flag:** generalized gate is proven deterministically (L17) + committed in source
  (`e5c9ef6`); it was **deliberately not re-run inside live CI** this session (rationale: L18 / Phase-5b) — must
  be stated as "source-general, live re-run deferred," not "fully validated live."

### Loop-2 bottom line (for the next loop)
- **Harness defects = 4, all in Phase 0** (the scenario-axis refactor: P0-1 eval oracle, P0-2 validator driver,
  P0-3 fixture layout, P0-4 contract doc). After that, **S2/S3/S4/S5 each ran with ZERO gate edits** — the
  per-agent gates were already content-general; the mono-scenario coupling lived only in the *plumbing*.
- **Regression guard never broke:** 19→23→27→33→40 fixtures, S1 green throughout.
- **Do-not-redo:** don't re-add 429 logic to `eval-rubric.mjs`/`run.mjs` (it's rubric-driven now); a new
  scenario = a new `scenarios/<id>/` folder + (if a new acceptance *kind*) one rubric module, never a gate edit.
- **Still open (honest):** live re-run of the generalized eval-rubric (400) + deploy E2E *inside* the live repo
  CI; independent human PR-reviewer needs a 2nd identity at demo time (solo repo).

---

## 🔁 LOOP 3 — Closed-loop deploy/run-status (2026-06-28)

**Goal:** close **G1–G3** — the harness was BLIND to GitHub Actions run status (the DevOps agent observed
only `/healthz`; the orchestrator was fire-and-forget; the loop never read the run conclusion, so "runs
failing in GitHub" were invisible). Narrowed to this core by a rubber-duck **GO-WITH-FIXES** verdict;
observability (**G4**) + Azure SRE agent + S6 deferred to L4 (`HARNESS_BACKLOG.md`). Regression guard stayed
green throughout: **40 → 47 → 49 fixtures, 28 negatives caught, exit 0** (no scenario regressed).

### What was BUILT (offline, Wave 1)
- **M1** `demos/ci/lib/run-status.mjs` (PURE classifier/oracle + retry taxonomy) + `gh-run-reader.mjs` (the
  only `gh`-shelling adapter). The pure/adapter split kills the M2→M1 circularity the duck flagged.
- **M2** `ci/scripts/workflow-conclusion-check.mjs` + a `workflow-conclusion` validator driver + **7 canned
  fixtures**. A "red pipeline" is replayable JSON, never a live one-shot (duck BLOCKING #1/#2/#5).
- **M3** `orchestrator/cli.mjs --watch` — polls the EXACT run for a dispatched unit (identity-bound), classifies,
  reacts per the retry taxonomy (retry ONLY transient; never auto-retry a real failure), `--report-issue`.
- **M4** `ci/scripts/lm-judge.mjs` advisory default-on (deterministic `--verdict`/fixture) + driver + 2 fixtures:
  token-absent ⇒ pass; verdict-fail ⇒ finding recorded yet **exit 0** (never part of the green invariant).
- **M5** `CONTRACT.md` §11 crutch-vs-durable annotation (the run-status gate = **Durable**); `deployment.agent.md`
  made run-conclusion-aware; `AGENT.md` How-to-Verify refreshed (49/49) + standing constraints.

### Agent × scenario (tested / behaved / fixed)
| Agent / gate | Tested how | As expected? | Defect / fix |
|---|---|---|---|
| **Deployment (run-status, NEW)** | 7 canned fixtures: success · rerun-attempt2 · failure-for-SHA · green-for-WRONG-SHA · older-green+newer-red · queued-timeout · cancelled | ✅ all 7 (2 pass, 5 negatives caught) | none — net-new gate, built to the duck's spec |
| **Quality-Test (lm-judge advisory)** | 2 fixtures: no-token skip; verdict=fail | ✅ skip⇒pass; fail⇒`advisory-fail` recorded yet exit 0 | none — reframed optional→advisory-default-on |
| **Deployment (smoke) + all S1–S5 agents** | full regression | ✅ green throughout | none |

**Pure-core self-test (temp, deleted after running): 13/13** — classifier (success/failure/skipped/neutral/queued)
+ retry taxonomy (proceed/wait/retry/report) + selection (older-green+newer-red ⇒ no-go).

### Still open / honest boundaries
- **Wave 2 (live) — DONE (2026-06-28).** Full closed loop proven on the public `agentic-sdlc-demo-live`:
  orchestrator `--assign` dispatched **@copilot** to issue #29 (it opened PR #32); a GREEN PR (#30) Tests & Evals
  success → `--watch` **GO** (exit 0); a RED PR (#31, deliberately failing test) Tests & Evals failure → `--watch
  --report-issue 29` **NO-GO** (exit 1) and **posted the NO-GO to issue #29**. The orchestrator is no longer
  fire-and-forget — it observes the real run conclusion and reports. (Bonus `deploy.yml inject_fault` run was
  dispatched; `--watch` correctly held `pending→wait` on GitHub's runner queue — the transient path, proven live.)
  Used the workflow-scoped keyring token (cleared `GH_TOKEN`). Proof scaffolding left on the test repo by request.
- **G4 observability untouched** — production exceptions remain invisible until backlog **B1** ships.
- **Do-not-redo:** run-status classification lives ONLY in `ci/lib/run-status.mjs` (pure) — never re-add
  conclusion literals to the validator/runner. A new scenario reuses the `workflow-conclusion` gate as-is
  (fixtures carry their own canned `runs`+`identity`).

---

## 🔁 LOOP 4 — Run-status generalization + test-mode DELEGATED approval (2026-06-29)

**Goal:** clean repo; build a heavily-gated TEST-MODE delegated-approval helper (honest, not "human review"); prove the
Loop-3 run-status gate is scenario-general. Rubber-duck GO-WITH-FIXES → S6 + full unattended prod capstone deferred to L5.

### Built
- **Repo hygiene:** closed Loop-3 proof #29/#30/#31/#32, deleted proof branches, cancelled stuck run 28336842138; kept #21,#22-#26,#27,#28,#33.
- **Delegated approver:** `ci/lib/approval.mjs` (PURE) + `ci/scripts/auto-approve.mjs` (adapter, +live discovery dry-run). 12 fixtures (2 pos + 10 refusals: wrong-repo/no-ledger/sha-mismatch/missing-label/branch/sensitive-files/cant-approve/over-budget/deadline/kill-switch). DRY-RUN default; live only AUTO_APPROVE_TEST_MODE=1. Honest 🟨 "delegated, no human reviewed".
- **Run-status scenario-general:** S2-S5 each got success-GO + failure-NO-GO fixtures with ZERO gate edits. Matrix 49→69 (42 negatives).

### Defects found: NONE (gates were already content-general). Live discovery revealed action_required = bot-PR "approve and run" (not env deployments) → handled by runs/{id}/approve, deferred to L5.
### L5 backlog: S6 auth scenario; first ATTENDED auto-approved prod-deploy capstone; runs/{id}/approve bot-run approval.
