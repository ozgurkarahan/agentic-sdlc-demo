# `demos/validate/` — Tier-1 harness validation

The deterministic backbone of the demo. It proves the harness **logic** and every agent's
**artifact contract** hold — and, crucially, that each gate **catches its seeded failure**.
A negative fixture that slips through is flagged **THEATER** and the run fails.

```bash
node demos/validate/run.mjs            # human-readable matrix
node demos/validate/run.mjs --json     # machine-readable
node demos/validate/run.mjs --filter quality-test   # one agent
```
Exit `0` only if **every** fixture's actual outcome equals its expected outcome (and the
expected machine signals are present). Exit `1` on any mis-handled fixture.

## What this is — and is NOT
- ✅ **Is:** a proof that the harness logic + artifact contracts are sound, with adversarial
  negatives that must be caught. Runs offline, no GitHub, no secrets.
- ❌ **Is NOT:** a measure of live-agent quality. Whether a real LLM *emits* a sound plan or
  *writes* a correct limiter is only exercised in **Tier-3** (the live `@copilot` fleet). T1
  drives the **checks** with seeded inputs so the gates themselves are validated.

## How a fixture flows
Every fixture is a JSON file at `demos/fixtures/<agent>/<case>.json` following CONTRACT §4:
```jsonc
{ "agent": "...", "case": "...", "polarity": "positive|negative",
  "enforcement": "native|ci-job|local-assertion|advisory|external",
  "driver": "plan-lint|path-scope|trajectory|eval-rubric|pin-check|doc-coupling|smoke|dispatch",
  "input": { /* agent-specific seeded input */ },
  "expect": { "outcome": "pass|blocked", "signals": ["..."] } }
```
The runner routes `input` to the named **driver** (a thin adapter over the real D2 check
scripts in `demos/ci/scripts/`), normalises the result to `{outcome, signals}`, then asserts
`actual.outcome === expect.outcome` **and** every `expect.signals[]` is present.

| polarity | must produce | a failure here means |
|---|---|---|
| `positive` | `outcome: "pass"` | **FALSE-BLOCK** — a good artifact was wrongly stopped |
| `negative` | `outcome: "blocked"` | **THEATER** — the gate didn't actually catch the bad artifact |

## Driver → real check mapping
| driver | backing script | what it proves | enforcement |
|---|---|---|---|
| `plan-lint` | `ci/scripts/plan-lint.mjs` | Planning / Rubber-Duck plan-artifact contract (no ordered-unit-marked-parallel, no shared-path parallel units, no integration-marked-parallel) | 🟦 local-assertion |
| `path-scope` | `ci/scripts/path-scope-check.mjs` | Dev fleet stayed in its declared lane | 🟦 ci-job |
| `trajectory` | `ci/scripts/trajectory-check.mjs` | Dev fleet touched declared files **and** added the required test | 🟦 ci-job |
| `eval-rubric` | `ci/scripts/eval-rubric.mjs` | Quality/Test output contract (429 at threshold + numeric `Retry-After`) | 🟦 ci-job |
| `pin-check` | `ci/scripts/pin-check.mjs` | Security supply-chain (slopsquat / mutable / no-lockfile) | 🟦 ci-job (+ 🟩 GHAS in T2) |
| `doc-coupling` | `ci/scripts/doc-coupling-check.mjs` | Code-review advisory: arch change without docs | 🟨 advisory (+ 🟩 CODEOWNERS in T2) |
| `smoke` | `ci/scripts/smoke-check.mjs` | Deployment go/no-go + rollback on a failing smoke | 🟦 local-assertion (+ 🟩 Environment in T2) |
| `dispatch` | `orchestrator/dispatch.mjs` | Orchestrator fans out only an **approved** plan; ordered units wait | 🟦 local-assertion |

## The seeded matrix (19 fixtures, 10 adversarial negatives)
Every agent gets at least one positive (must pass) and one negative (must be caught):

- **planning** — sound DAG passes · an inherently-ordered unit marked parallel is caught.
- **rubber-duck** — corrected plan passes · a flawed plan (two "parallel" units share a
  limiter store + integration test mislabeled parallel) is caught.
- **dev-fleet** — in-lane change passes · straying into another unit's file is caught;
  feature+test passes · feature with **no test** is caught.
- **quality-test** — a correct limiter scores 3/3 · a no-429 impl and a missing-`Retry-After`
  impl both turn the eval RED.
- **security-compliance** — the real app (caret ranges + lockfile) passes · a synthetic
  manifest (`expresss`/`axioss` typosquats, `*`/`latest` mutable specs, no lockfile) is caught.
  *(Decoupled from the rate-limit story on purpose — supply-chain risk is orthogonal.)*
- **code-review** — docs-updated change is clear · an arch change with no docs is flagged
  (advisory: in T2 the native block is a required CODEOWNERS review).
- **deployment** — a healthy build smokes green → go · a build with a broken `/healthz`
  (`break-healthz.mjs`) → no-go + rollback. *(Decoupled synthetic failing-smoke.)*
- **orchestrator** — an approved plan fans out the 3 parallel units (integration held) · an
  **unapproved** plan → the dispatcher refuses to fan out anything.

**Human gates** (plan-approved label · CODEOWNERS review · Environment approval) are 🟩 native
/ ⛔ external and are **not executable in T1** — the runner lists them as INFO rows and they are
verified in Tier-2/Tier-3.

## Honesty contract
The dispatcher's plan-approval gate and the path-scope/eval/trajectory checks are **layered
orchestration / custom CI logic (🟦)** — *not* native GitHub pre-code enforcement. The runner
prints the enforcement label on every row so the matrix can never be read as claiming the
platform blocks something it doesn't. Native blocking (🟩 rulesets, CODEOWNERS, Environments,
GHAS) is only real once the harness is instantiated in the dedicated repo (Tier-2, D7).
