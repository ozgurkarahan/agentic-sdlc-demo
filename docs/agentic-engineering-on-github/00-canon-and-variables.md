# 00 · Canon & Variables — the frozen contract

> **What this file is.** The shared, authoritative definitions every other part of this asset
> depends on: the vocabulary, the white-label variables, the agent roster, the phase model, and
> the four rules that keep the asset honest (native-vs-layered, the enforcement boundary, the
> traceability chain, and white-label hygiene). Read this first. The Story (`01`), the
> Agents/Skills/Harness reference (`02`), the Pipeline (`03`), and the drop-in `harness/` all
> instantiate the contract defined here — they do not redefine it.

> **Why a "frozen contract."** This asset is itself built the way it preaches: planned, validated,
> then executed as a small fleet of parallel work units. Freezing the vocabulary, the roster, and
> the rules up front is what lets independent sections be written in parallel without drifting —
> exactly the role a good `AGENTS.md` plays for a fleet of coding agents. It is the **static
> context** of this asset.

---

## 1. How to use this asset (white-label)

This is a **reusable, client-agnostic** narrative-and-harness asset titled **"Agentic Engineering
on GitHub."** It is not a slide deck. It is the story, the agents and their harness, and the
GitHub-powered pipeline — written so the same asset can be re-pitched to any client by setting a
handful of variables.

Everything client-specific lives in a **call-out block** like this:

> 📌 **CALL-OUT — set per client.** Replace the variables below; never bake a client, industry, or
> product into the surrounding prose.

> 🔒 **IF HIGH-ASSURANCE.** Extra guidance that applies only to regulated / high-stakes clients
> (finance, healthcare, aerospace, automotive, public sector). Skip for standard-assurance pitches.

If a sentence outside a call-out names a specific app, industry, deploy target, or concurrency
number, that is a **white-label leak** and a defect (see §9).

---

## 2. White-label variable schema

| Variable | Meaning | Locked default for this asset |
|---|---|---|
| `{{CLIENT}}` | Client name | *generic — unnamed by default* |
| `{{DOMAIN}}` | Client's domain / industry | *neutral by default* |
| `{{ASSURANCE}}` | `standard` or `high-assurance/regulated` | `standard`, with **🔒 IF HIGH-ASSURANCE** call-outs throughout |
| `{{DEMO_APP}}` | A small but realistic service the agents build end-to-end | a small REST API service (e.g. a URL-shortener or a payments/ledger-style microservice) |
| `{{DEPLOY_TARGET}}` | The chosen test environment | a test environment via GitHub Actions + Environments, including a local/on-prem option via a self-hosted runner |
| `{{SECURITY_QA_TOPOLOGY}}` | Dedicated vs combined Security/QA | combined at low maturity; **dedicated Security/Compliance split out early for high-assurance** |
| `{{FLEET_CONCURRENCY}}` | Max agents working in parallel | a demo-safe **3** |
| `{{AUDIENCE}}` | Who the pitch is for | engineering leaders + senior developers evaluating adoption |

> 📌 **CALL-OUT — set per client.** Before any client pitch, fill `{{CLIENT}}`, `{{DOMAIN}}`,
> `{{ASSURANCE}}`, `{{DEMO_APP}}`, `{{DEPLOY_TARGET}}`, and `{{FLEET_CONCURRENCY}}`. Tailor the
> "stakes" example in the Story to `{{DOMAIN}}` (revenue-critical, data-critical, or
> safety-critical). Everything else stays as written.

---

## 3. The canon — shared vocabulary

These terms are used **consistently and exactly** across the whole asset. This is the language of
the agentic-engineering literature, instantiated on GitHub.

- **The Spectrum.** *vibe coding → structured AI-assisted coding → agentic engineering.* The
  differentiator is **not whether you use AI**, but how much structure, verification, and human
  judgment surround the AI's output. Higher-stakes work belongs at the agentic end.
- **Syntax → Intent.** Developers express **what** to build; the machine handles **how**.
  *"Intent is the new interface."*
- **Plan → Validate → Execute.** Always produce a plan first; have it validated by a
  rubber-duck / devil's-advocate pass (and a human); only then implement. **Never implement an
  unvalidated plan.**
- **Fleet Mode / Parallel Orchestration.** The orchestrator **decomposes** work into independent
  units and runs a **fleet** of agents concurrently — each in its own sandbox/branch/PR — then
  **converges** the results (**fan-out / fan-in**). A **dependency graph** marks which units are
  parallel-safe vs. ordered. This is orchestrator mode taken to scale.
- **Verification = Tests + Evals.** **Tests** verify deterministic behavior (input → output).
  **Evals** verify non-deterministic behavior: **trajectory evaluation** (did the agent take the
  right steps and choose the right tools?) and **output quality** (scored by rubrics / an
  LM-judge). Without both, it is still vibe coding. *"Set the bar at the eval, not the demo."*
- **Context Engineering.** The core skill. Six context types every agent needs —
  **Instructions, Knowledge, Memory, Examples, Tools, Guardrails** — split into **Static context**
  (always loaded: rule files, persona) and **Dynamic context** (loaded on demand: skills, tool
  results, RAG). Context engineering is also a **financial lever** (high-signal, low-token payloads).
- **Agent Skills.** Portable packages of procedural knowledge loaded via **progressive
  disclosure**, so a lightweight generalist agent flexes into specialist roles without bloating
  its prompt.
- **The Harness.** **Agent = Model + Harness.** The harness is everything wrapped around the
  model: instructions/rule files, tools, sandboxes/execution environments, orchestration logic
  (sub-agents, model routing, handoffs, fleet dispatch), guardrails/hooks, and observability.
  Maxim: **"Most agent failures are configuration (harness) failures, not model failures."**
- **The Factory Model.** The developer's primary output is **not code** — it is the **system that
  produces code** (specs + context, agents, tests/quality gates, feedback loops, guardrails).
- **Conductor vs. Orchestrator.** **Conductor** = hands-on, real-time, in-IDE direction.
  **Orchestrator** = async delegation to a fleet of agents, reviewing results.
- **The 80% Problem.** Agents produce ~80% of a feature fast; the last 20% (edge cases,
  integration, subtle correctness) needs human contextual judgment. This defines where the gates go.
- **Economics.** vibe coding = **low CapEx / high OpEx** (token burn, maintenance tax, security
  remediation); agentic engineering = **high CapEx / low OpEx**. Use **intelligent model routing**:
  premium models for planning/architecture/implementation, cheaper models for tests, review, and
  CI monitoring.
- **Open standards.** **MCP** (Model Context Protocol) for tool access; **A2A** (Agent2Agent) for
  cross-agent delegation / handoffs.

---

## 4. Agent roster contract (canonical names + the gate each owns)

Every section uses **these exact role names and gates**. Full schemas live in `02`; this table is
the frozen index.

| # | Agent (canonical name) | Gate it owns |
|---|---|---|
| 0 | **Orchestrator** (human, optionally assisted) | Intent, decomposition, fleet dispatch, fan-in, accountability |
| 1 | **Planning / Requirements Agent** | Well-formed work |
| 2 | **Rubber-Duck / Plan-Validation Agent** | **Validated plan (HARD GATE before any code)** |
| 3 | **Development Agent (Fleet)** | Working implementation |
| 4 | **Quality / Test Agent** | Functional correctness |
| 5 | **Security / Compliance Agent** | Safe & auditable |
| 6 | **Code Review Agent** | Quality & architecture |
| 7 | **Deployment / Validation Agent** | Release readiness |

---

## 5. Phase-model contract (the pipeline phases)

The pipeline in `03` traces one intent through **four phases**. These names and what each phase
enforces are frozen here.

| Phase | Name | Mode | What it enforces |
|---|---|---|---|
| **A** | **Plan** | human-led, sequential | Intent becomes a Work Plan: Issues (acceptance criteria + Definition of Done + test/eval strategy) + a dependency graph (parallel-safe vs. ordered) |
| **B** | **Validate** | **HARD GATE** *(process)* | Rubber-duck stress-tests the plan + decomposition + parallelization; **human approves the plan**. Enforced by **orchestration/dispatch discipline** (a 🟦 layered gate — the orchestrator only fans out work for an approved plan), **not** by native pre-code GitHub enforcement |
| **C** | **Execute in parallel** | fleet mode | Fan-out: a fleet of Development agents on parallel-safe Issues, each its own branch/PR; per-PR Quality, Security, and Review gates run concurrently; dependent units wait per the graph |
| **D** | **Integrate & deploy** | fan-in | Converge PRs via merge queue; integration tests + evals; deploy to `{{DEPLOY_TARGET}}`; smoke + synthetic traffic; release gate; full traceability |

---

## 6. RULE — Native GitHub vs. Layered Pattern

To stay honest, the asset **labels every capability** as one of:

- **🟩 Native GitHub** — a real, shipping product capability. Examples: Issues / sub-issues /
  issue forms / Projects; **Copilot coding agent** (assign an Issue → isolated env/branch → linked
  PR; **multiple issues run concurrently**, each in its own env/branch/PR; auto-runs CodeQL, secret
  scanning, dependency review, and a quality self-review on the code it writes, attempting fixes —
  this **baseline** needs **no GitHub Advanced Security license**); **Actions** matrix + concurrency;
  **merge queue**; `AGENTS.md` (repo-wide + nested); custom agents `.github/agents/<name>.agent.md`;
  custom instructions `.github/copilot-instructions.md` + path-scoped `.github/instructions/*.instructions.md`;
  prompt files `.github/prompts/*.prompt.md`; **Copilot code review**; **CODEOWNERS**; **GHAS**
  (CodeQL, secret scanning + push protection, Dependabot / Advisory Database, **Copilot Autofix**,
  security overview); rulesets / branch protection, required status checks, required reviews,
  **Environments** with required reviewers / wait timers / deployment protection rules; Actions
  logs, deployment history, and Copilot usage metrics.
- **🟦 Layered Pattern** — *not* a GitHub product; a pattern you build **on** the platform.
  **Evals** are layered: implement them as **Actions jobs** that run rubric checks, trajectory
  evaluators, regression suites, or an LM-judge step — they gate the merge via **required status
  checks**. **A2A handoffs** are layered: a **convention** for passing work between agents using
  Issues, sub-issues, PR links, labels, and check outputs — not a GitHub feature.
- **🟨 Integration point / context surface (not enforcement).** **MCP servers** are an integration
  point — say *"tools can be exposed via MCP,"* not *"every repo has MCP tools."* **Copilot Spaces**
  are a curated **context** surface, not a gate. **Copilot code review** is **advisory** — it posts
  comments; it only **blocks a merge** when wired to a **required check / required review** policy.
  Never place Spaces or an advisory review in the same column as branch protection or Environments.

> **One-line test before writing any claim:** *Is this a product I could point to in the GitHub UI
> (🟩), a job/convention I build on top (🟦), or a context/integration surface that informs but does
> not enforce (🟨)?* Label it accordingly.

---

## 7. RULE — Enforcement-Boundary taxonomy

"Enforced" is not one thing. The asset classifies every gate into exactly one tier:

| Tier | What actually enforces it | Examples in this asset |
|---|---|---|
| **Hard GitHub enforcement** | Platform refuses to proceed | Rulesets / branch protection; **required status checks**; **required reviews** (+ CODEOWNERS); **Environments** with required reviewers / wait timers / deployment protection rules; **merge queue** |
| **Actions-based enforcement** | A job runs and reports pass/fail; becomes "hard" only when set as a **required** check | Test suites; **evals** (rubric / trajectory / LM-judge); security-triage jobs; integration tests |
| **Social / prompt convention** | Shapes agent + human behavior but does not block | `AGENTS.md`, `.github/agents/*.agent.md`, prompt files, issue forms, the A2A handoff convention, advisory Copilot code-review comments |

> **Where the plan-validation gate sits:** human plan-approval is *judgment*; making *"no code
> starts before approval"* real requires **orchestration/dispatch automation** (only assign Issues
> for an approved plan) — a **🟦 layered gate**, **not** native pre-code enforcement. GitHub does not
> natively stop an agent from *starting* before a PR exists; a required status check can only block
> the *merge* of unapproved-plan work later.

> **The load-bearing insight:** an issue form, an `AGENTS.md`, or an example workflow file **does
> not govern anything by itself.** Governance is real only when a check or review is marked
> **required** and a ruleset/Environment **enforces** it. The asset must say this plainly wherever
> it could be misread (especially in `harness/`).

---

## 8. RULE — Canonical Traceability Chain

Every change is traceable end to end. This is the chain the asset references everywhere it talks
about audit / governance:

```
intent
  → tracking Issue (+ sub-issues)              [Planning agent]
  → Work Plan artifact / issue comment         [Planning agent]
  → plan approval (label/comment) + dispatch gate   [Rubber-Duck + HUMAN; 🟦 orchestration]
  → agent branch                               [Development fleet]
  → linked Pull Request                        [Development fleet]
  → status checks + evals (Actions)            [Quality / Security / Review gates]
  → human review / approval (CODEOWNERS)       [Code Review gate + HUMAN]
  → merge queue                                [fan-in]
  → deployment + deployment history            [Deployment agent + Environment HUMAN gate]
```

Each arrow is a **native link** (an Issue references a PR, a check is attached to a commit, a
deployment is recorded in history) — **except the plan-approval → dispatch step, which is a 🟦
layered orchestration link** — which is why the audit trail survives without bespoke tooling.

---

## 9. RULE — White-label hygiene

Before the asset is considered done, it passes this checklist (run in unit **U5**):

- [ ] No `{{DEMO_APP}}` specifics (URL-shortener, payments-ledger, "the REST API") appear **outside
      a call-out** in generic prose.
- [ ] No assumption that the client uses REST, the chosen `{{DEPLOY_TARGET}}`, a self-hosted runner,
      or `{{FLEET_CONCURRENCY}} = 3` leaks into framing that should be neutral.
- [ ] `{{ASSURANCE}}` defaults to `standard`; every regulated addition is inside a
      **🔒 IF HIGH-ASSURANCE** call-out, never the baseline.
- [ ] Client-specific phrasing uses the required forms: *"Example default: `{{DEMO_APP}}`…"*,
      *"Replace this with the target repo's actual service boundary…"*, *"For a regulated /
      high-assurance environment…"*.
- [ ] Every capability carries a 🟩 / 🟦 / 🟨 label (or is unambiguous in context); evals and A2A
      are never described as native products.

---

## 10. Tone & constraints (apply everywhere)

- Use the canonical vocabulary in §3 consistently; tie every agent's "skills" to **Agent Skills**
  and the **six context types**.
- Name only real GitHub capabilities; mark evals and A2A as **layered patterns** (§6).
- Executive-credible, technically concrete, **no hype**.
- Fully white-label; keep all adaptation in call-outs (§1, §9).
- Be honest about current limits and where humans remain accountable (the 80% problem; evals over
  demos; the plan-validation gate).
