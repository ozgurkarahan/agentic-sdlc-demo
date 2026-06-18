# Copilot Instructions

Read these files for full context:

- `AGENT.md` — Project overview, architecture, environment vars, workflow rules, references
- `~/projects/memory/wiki/projects/agentic-sdlc-demo.md` — Project's wiki page (durable knowledge; replaces deprecated `.ai/` files)
- `~/projects/memory/agent-config/workflow.md` — Global workflow rules
- `~/projects/memory/agent-config/platform.md` — Platform preferences and Windows / ARM64 specifics
- `~/projects/memory/wiki/skills/*.md` — Triggerable AI workflows (`ingest`, `query`, `lint`, `end-session`, etc.)

## Copilot-Specific Tips

- Use `@workspace` to give Copilot full project context.
- Pin `AGENT.md` and the project's wiki page in chat for persistent context.
- Use Copilot Edits (Ctrl+Shift+I) for multi-file changes.
- Run tests manually — Copilot CLI cannot execute long-running tests in your IDE flow.
- When corrected, route the lesson to the **wiki** (not `.ai/`): create or update a page under `~/projects/memory/wiki/lessons/` and append to `~/projects/memory/log.md`.

## End-Session Workflow

See `.github/instructions/end-session.instructions.md` for the project-specific shim. Summary:

1. Project docs sweep (AGENT.md, .claude/CLAUDE.md Project Context block)
2. Wiki compounding (graduate durable findings via [[ingest]] workflow)
3. Git status check
4. Smoke check (run `AGENT.md` § How to Verify checks)
5. Summary report

