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
