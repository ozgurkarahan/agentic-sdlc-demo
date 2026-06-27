# Demo Contract (D0 — FROZEN)

> The single source of truth every build unit (D1–D9) reads. Defines the demo's locked decisions, the
> frozen story, the directory layout, the tier → enforcement map, and the **fixture schema** the
> Tier-1 validator (`demos/validate/`) consumes. Change this only with a new rubber-duck pass.

This demo makes the **EXAMPLE** harness under `docs/agentic-engineering-on-github/harness/` actually
**run** and **validate itself**. The harness stays a generic template; the demo is a concrete,
runnable instantiation of it around a real sample app.

---

## 1. Locked decisions (approved 2026-06-19)

| # | Decision | Value | Rationale |
|---|---|---|---|
| 1 | Live-instance home (T2/T3) | **Dedicated target repo** (created at D7) | Enabling rulesets on *this* repo would gate the asset-authoring `master`. Surfaced to human at D7. |
| 2 | Default branch | **`master`** — all demo workflows/rulesets target `master` | Non-disruptive; this repo's default is `master`, not `main`. |
| 3 | Stack | **Node 20 + TypeScript + Express** URL-shortener | Matches the CodeQL `javascript-typescript` example; zero external services. |
| 4 | T3 liveness | **Live `@copilot` fleet + pre-recorded fallback** | Fallback is *evidence, not validation* (see §5). |

## 2. The frozen story (the one intent)

> **"Add rate limiting to the URL-shortener API so a single client can't exhaust the service."**

Decomposes into **4 work units** — 3 parallel-safe + 1 ordered:

| Unit | Scope (owned paths) | Parallel? | DoD (abridged) |
|---|---|---|---|
| **U1 — limiter middleware** | `sample-app/src/middleware/rateLimit.ts` (+ its unit test) | parallel-safe | fixed-window limiter; returns **429** + **`Retry-After`** when over limit |
| **U2 — config surface** | `sample-app/src/config.ts` (+ its unit test) | parallel-safe | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` env-driven with safe defaults |
| **U3 — docs** | `sample-app/README.md` (rate-limit section) | parallel-safe | documents the limit, headers, and config knobs |
| **U4 — integration test** | `sample-app/test/e2e/rateLimit.e2e.test.ts` | **ordered** (needs U1+U2) | drives the app past the limit; asserts 429 + `Retry-After` end-to-end |

The DAG: `U1 ∥ U2 ∥ U3` then `U4` (depends on U1, U2). This is what the **Planning** agent must emit and
what the **Dispatcher** must respect (U4 held until U1+U2 land).

## 3. Directory layout (every unit writes only inside its box)

```
demos/
  CONTRACT.md            # D0 — this file (FROZEN)
  README.md              # D0 stub → D6 fleshes out (entry point + how to run T1)
  DEMO_SCRIPT.md         # D6 — presenter golden-path script
  ATTRIBUTION.md         # D3 — awesome-copilot (MIT) reference credit
  sample-app/            # D1 — system under test (Node/TS/Express URL-shortener), ships "before" (no limiter)
  ci/                    # D2 — REAL verification (replaces every harness `echo`)
    workflows/           #   real workflow YAMLs (target branch: master) — instantiated into the T2 repo at D7
    scripts/             #   the underlying runnable logic (callable locally by the validator, no Actions needed)
  agents/                # D3 — enriched personas (orchestrator.agent.md) — see §6 (harness personas enriched in place)
  orchestrator/          # D4 — the dispatcher (plan-approved label gate + wave-order fan-out)
  fixtures/              # D5 — seeded positive/negative fixtures per agent (see §4 schema)
  validate/              # D5 — Tier-1 deterministic validation runner
  evidence/              # T3 — pre-recorded fallback evidence (populated at D8)
```

**Path-ownership rule (the demo eats its own dogfood):** each unit/agent writes ONLY inside its box.
The `path-scope-check` (D2) enforces this for PRs; the dispatcher (D4) assigns non-overlapping paths.

## 4. Fixture schema (the contract D5 implements)

Every fixture is a JSON file at `demos/fixtures/<agent>/<case>.json`:

```jsonc
{
  "agent": "rubber-duck",              // planning | rubber-duck | dev-fleet | quality-test |
                                       //   security-compliance | code-review | deployment | orchestrator
  "case": "negative-hidden-dependency",
  "polarity": "negative",             // "positive" (must PASS/green) | "negative" (must be CAUGHT/red)
  "enforcement": "local-assertion",   // "native" | "ci-job" | "local-assertion" | "external"
  "title": "rubber-duck catches a hidden cross-unit dependency marked parallel-safe",
  "input": { /* agent-specific seeded input — see per-agent shape below */ },
  "expect": {
    "outcome": "blocked",             // "pass" | "blocked"
    "signals": ["hidden-dependency", "unsafe-parallelization"]  // machine-checkable markers
  }
}
```

- **`enforcement`** MUST match the validation matrix label in `plan.md`. The validator prints it next to
  each result so nothing is presented as a stronger guarantee than it is
  (`native` 🟩 GitHub primitive / `ci-job` 🟦 our required check / `local-assertion` 🟦 logic proof /
  `external` ⛔ needs coding-agent or Models).
- **`polarity: "negative"` ⇒ `expect.outcome: "blocked"`** (the gate must fire). The validator FAILS if
  a negative fixture is NOT caught (theater detection) or a positive fixture is wrongly blocked.

### Per-agent `input` shapes (D5 fills these)
- **planning** → `{ "intent": string }` ; checker asserts emitted plan marks dependent units ordered.
- **rubber-duck** → `{ "plan": <plan object> }` ; checker asserts the flaw signals are detected.
- **dev-fleet** → `{ "declaredPaths": string[], "changedPaths": string[] }` ; `path-scope-check`.
- **quality-test** → `{ "appVariant": "good"|"missing-retry-after"|"no-429" }` ; runs eval rubric.
- **security-compliance** → `{ "manifest": <package.json fragment>, "sink"?: string }` ; pin/slopsquat + sink.
- **code-review** → `{ "diff": <descriptor>, "docsTouched": boolean }` ; advisory flag (non-blocking).
- **deployment** → `{ "smoke": "pass"|"fail" }` ; rollback/no-go on fail.
- **orchestrator** → `{ "planApprovedLabel": boolean, "units": <dag> }` ; dispatch only if approved.

## 5. Tier → enforcement map (honesty contract)

| Tier | Proves | Enforcement available | NOT claimed |
|---|---|---|---|
| **T1** (local) | harness logic + each agent's **artifact contract** via seeded fixtures | `local-assertion` + the real `ci-job` scripts run directly | live agent quality; native GitHub blocking |
| **T2** (dedicated repo) | the gates actually **bite** | `native` (rulesets/required checks/reviews/Environments/GHAS) + `ci-job` made required | T3 agent behavior |
| **T3** (live fleet) | real `@copilot` agents author PRs from issues | `external` (coding-agent + Models) | — |

**The dispatcher's "plan-approved gate" is `local-assertion` / orchestration — NEVER native pre-code
enforcement.** GitHub enforces only the required status check / the label-conditioned workflow result.
Re-introducing the "native plan gate" overclaim is the worst possible regression (it's the exact thing
the written asset corrects). A pre-recorded T3 is **evidence, not validation**: if the coding agent is
unavailable, T3 is reported "not validated," not "replaced by `actions/ai-inference`."

## 6. Reuse vs. build + attribution

- **Build ourselves (the differentiator):** the governed pipeline — hard-but-layered plan gate, fleet
  fan-out, the **dependency-graph dispatcher**, CI-native wiring, enforcement primitives. `awesome-copilot`
  has the parts, not this connective tissue.
- **Personas:** our 6 harness personas are **original** (pattern-inspired by `awesome-copilot`, not copied
  verbatim). `demos/ATTRIBUTION.md` (D3) credits `github/awesome-copilot` (MIT) as design reference. If any
  text is ever lifted verbatim, mark that file "adapted from <path> (MIT)" and preserve the notice.
- **Frontmatter enrichment (D3):** add `tools` / `model` / `mode: subagent` / `disable-model-invocation`
  to the 6 personas **in place** under `docs/.../harness/agents/`, and add `orchestrator.agent.md`.

## 7. Public-repo / fork-PR secret policy (load-bearing)

This repo (and likely the T2 repo) is PUBLIC ⇒ **zero secrets in the tree**, and fork PRs can't read repo
secrets. Therefore:
- Deterministic **tests + evals run with NO secrets** and are the **required** gate.
- **LM-judge is optional / non-required**; with no token it **no-ops** (does not fail).
- **No `pull_request_target`** unless untrusted checkout/exec is isolated and documented.
- T3 coding-agent runs are **owner-initiated** (issue assignment), not fork PRs → secrets OK there.

## 8. Build order (fleet waves)

`D0` → {`D1` ∥ `D3`} → {`D2` ∥ `D4`} → `D5` → `D6` (`D7` may proceed once `D2,D3,D4` + human ready) →
`D7 → D8` → fan-in `D9`. T1 (D1–D6) needs no GitHub deps; T2 (D7) needs admin + `workflow` token; T3 (D8)
is conditional on coding-agent preflight. **DoD is tier-separated — T1+T2 ship the demo even if T3 is
unavailable.**

## 9. Definition of Done (per tier)

- **T1 (must):** every harness `echo` replaced by a real command; `demos/validate` matrix is green where
  it should be green and **red where it should be red**; each negative fixture (incl. decoupled Security +
  Deployment synthetics) demonstrably caught; each result labeled by enforcement type.
- **T2 (must, human):** harness instantiated in the dedicated repo; required checks set **after** check
  names register; a deliberately-failing PR is **blocked**; merge queue / Environment reviewer working or
  gracefully degraded + documented.
- **T3 (conditional):** live `@copilot` fleet authors PRs through the gates; if preflight fails, ship
  pre-recorded evidence, report "not validated," demo still counts as done.
- **Cross-cutting:** honesty labels intact; `ATTRIBUTION.md` present; no secret-dependent required check;
  `AGENT.md` How-to-Verify gains a "run the demo" row; asset docs cross-link `demos/`.
