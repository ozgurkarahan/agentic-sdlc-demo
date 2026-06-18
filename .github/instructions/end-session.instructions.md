---
applyTo: "**"
---

# End Session

When the user says "end session", "wrap up", or "done for today":

1. **Smoke check** — Run the checks in `AGENT.md` § **How to Verify** (tests, run, e2e). Confirm the session didn't leave the project broken. If red, decide: fix now, or document as known-broken in `AGENT.md`. If the How to Verify table is empty or stale, fill it in now — it's the contract for the next session.

2. **Project docs sweep** — Check whether any of these need updates from today's work:
   - `AGENT.md` (new env vars, changed commands, new "what NOT to do" entries, status changes)
   - `.claude/CLAUDE.md` (Project Context block — bump iteration status)
   - Project-specific files (`PLAN.md` if present, `agent.yaml` for hosted agents, etc.)

3. **Wiki compounding** — If significant findings emerged today, route them to the **memory wiki** (NOT to a project-local `.ai/` folder — that pattern was deprecated 2026-04-22):
   - **Recurring failure mode found** → ingest as `~/projects/memory/wiki/lessons/<slug>.md` (or update existing lesson if it sharpens a claim)
   - **Useful pattern emerged** → ingest as `~/projects/memory/wiki/patterns/<slug>.md`
   - **Domain knowledge refined** → update `~/projects/memory/wiki/domains/<domain>.md`
   - **Glossary terms added** → `~/projects/memory/glossary.md`
   - **Project page exists?** → update `~/projects/memory/wiki/projects/{this-project}.md` with status / decisions / open actions
   - **Project page does NOT exist yet?** → ingest the project as `~/projects/memory/wiki/projects/{this-project}.md` once the project has produced something durable
   - **Always** → append a one-line entry to `~/projects/memory/log.md` and emit an `~/projects/memory/ops/activity.jsonl` event for the active week

4. **Git check** — Run `git status`. If there are uncommitted changes, list them. If the project is not yet a git repo:
   - `git init`
   - Verify `.gitignore` excludes secret files (`.env`, etc.) and runtime caches
   - Make first commit: `git add -A && git commit -m "initial scaffold"`
   - **Do NOT push to a public remote without verifying no secrets leaked.**

5. **Summary** — Report:
   - What changed (files touched + reason)
   - What's still TODO
   - Wiki pages updated / created
   - Next session pickup point

