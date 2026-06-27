# `demos/orchestrator/` — the dependency-graph dispatcher (D4)

The connective tissue `awesome-copilot` doesn't ship: a dispatcher that reads a validated plan + its
dependency graph, **gates on a human `plan-approved` label**, fans out only parallel-safe units, holds
ordered units until their predecessors land, and defensively catches path-overlap planning errors.

> **Honesty (CONTRACT.md §5):** this is 🟦 **layered orchestration, NOT native GitHub enforcement.**
> GitHub enforces only required status checks / required reviews / the label-conditioned workflow
> result. The "plan-approved gate" here is the orchestrator *choosing* not to fan out. Never present
> `decideDispatch` as a platform primitive.

## Files
- `dispatch.mjs` — **pure core**, no deps, no side effects. `decideDispatch(plan, state)` + `validatePlan` + `formatDecision`. This is what the D5 orchestrator fixtures assert against.
- `cli.mjs` — thin CLI. Prints the decision; `--assign` (⛔ T3 only) assigns units to `@copilot` via `gh`.
- `example-plan.json` — the frozen rate-limit story as a canonical plan (the shape Planning emits, the dispatcher consumes, and fixtures reuse).

## The plan shape
```jsonc
{
  "intent": "…",
  "planApproved": true,                 // mirrors the human `plan-approved` label
  "units": [
    { "id": "U1", "paths": ["…"], "parallelSafe": true,  "dependsOn": [] },
    { "id": "U4", "paths": ["…"], "parallelSafe": false, "dependsOn": ["U1","U2"] }
  ]
}
```

## Try it (T1, no GitHub needed)
```bash
# Approved plan → fan out the 3 parallel-safe units, hold the ordered integration test:
node demos/orchestrator/cli.mjs --plan demos/orchestrator/example-plan.json

# After the parallel wave (U1,U2,U3) lands → the ordered U4 becomes ready and is dispatched:
node demos/orchestrator/cli.mjs --plan demos/orchestrator/example-plan.json --landed U1,U2,U3

# Flip planApproved:false in a copy → dispatcher REFUSES to fan out (exit code 1).
```

## Behaviours the validator pins (D5)
- `planApproved:false` → `approved:false`, `dispatch:[]`, refusal set, exit 1 (the **negative** test).
- approved → dispatch `U1,U2,U3`; `U4` held ("waits on predecessor(s): U1, U2").
- `--landed U1,U2,U3` → dispatch `U4` (ordered unit runs solo once the parallel wave clears).
- two parallel-safe units sharing a path → reported in `conflicts[]` and held ("plan needs re-validation").
