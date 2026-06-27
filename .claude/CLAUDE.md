# Claude Code — Project Config

> Read `AGENT.md` for project instructions (auto-loaded via root `CLAUDE.md`).
> Read `~/projects/memory/agent-config/workflow.md` for global workflow rules.
> Read `~/projects/memory/wiki/projects/agentic-sdlc-demo.md` for the project's wiki page (durable knowledge).

## Claude-Specific

- Use subagents (`explore`, `task`) for research and verbose long-running work; keep main context for decisions and code edits only.
- When proposing code changes, verify locally before claiming done — run the checks in `AGENT.md` § **How to Verify**; keep that section current as the project evolves.
- Update the **Project Context** block below at session end with the active iteration's status — what changed, what's next.
- Durable lessons go to the **wiki** (`~/projects/memory/wiki/lessons/`), NOT to a project-local `.ai/` folder.

## Project Context

Agentic SDLC Demo is a presenter-led, reusable demo environment that showcases the full software development lifecycle driven by AI coding agents — from a raw input (a requirement, meeting notes, or an action item) through plan → implement → test → review → PR → deploy. Scaffolded 2026-06-18 from `project-template`. It is a customer-facing showcase, NOT a hands-on lab: the presenter drives, the audience watches the agentic workflow. First-session task: research demoable agentic-SDLC surfaces (Copilot CLI + coding agent + PR review, Claude Code, GitHub Actions, Azure deploy) and propose the sample app + the input→lifecycle story before building anything (see `AGENT.md` § First Session Instructions). Durable knowledge lives at `~/projects/memory/wiki/projects/agentic-sdlc-demo.md`.

**Iteration status (2026-06-28):** Tier-1 backbone complete + green; **Phase 0 of the live path now complete** (commit `4a34e7b`, on `master`, **10 ahead / not pushed**). A 2nd rubber-duck pass that read the actual code found the plan-as-design sound but the **plan-as-executable** broken — 13 wiring fixes (R1–R13) + should-fixes applied across 5 local commits: orchestrator assign-race, fail-closed PR gates, contract-driven eval, `merge_group`, **ACR + managed-identity deploy-by-digest + both rollback variants**, **issue-native plan-lint** (`on: issues`), **CODEOWNERS + idempotent ruleset/Environment automation** with an anti-self-lock guard, and the **harness now defines the live real-results E2E** (I meta-verify, `@copilot` authors). T1 green throughout (`node demos/validate/run.mjs` → 19/19, 10/10 negatives; app 15/15). Release path is **secretless dual-plane** (OIDC control plane + AcrPull managed-identity data plane; IDs in repo Variables only). **Next:** Phase A (first real side effects, human-gated) — `gh auth refresh -s workflow`, create public `agentic-sdlc-demo-live` with seeded app + harness, T3 preflight (`@copilot` on a throwaway issue), then live Azure provision + deploy. Resources stay live; **no teardown at the validation stage.** Lesson graduated: `~/projects/memory/wiki/lessons/validate-plan-as-executable-not-just-design.md`.
