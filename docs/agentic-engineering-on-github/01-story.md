# 01 · The Story — Agentic Engineering on GitHub

> Deliverable 1. An executive-credible narrative for **{{AUDIENCE}}**. It uses the canon frozen in
> [`00-canon-and-variables.md`](./00-canon-and-variables.md) — the Spectrum, the Factory Model, the
> Harness, Fleet Mode, Plan → Validate → Execute, Tests + Evals. No hype. Every client-specific
> point is a call-out.

---

## The question every leader is actually asking

It is no longer *"should we use AI to write code?"* — that argument is over. The real question is:
*"How much of what our business depends on are we willing to let an AI write **without changing how
we work**?"*

That question lands differently depending on **where on the spectrum** you operate.

**The Spectrum** runs *vibe coding → structured AI-assisted coding → agentic engineering.* The
differentiator is not whether AI is involved — it is how much **structure, verification, and human
judgment** surround the AI's output. At the vibe end, you prompt, eyeball the result, and ship. That
is fine for a throwaway script. At the agentic end, the AI's output is planned, validated, tested,
evaluated, secured, reviewed, and traced — because the stakes demand it.

> 📌 **CALL-OUT — the CTO contrast (tailor to `{{DOMAIN}}`).** Picture two CTOs. The first says
> *"my team vibe-codes everything, it's incredibly fast."* For a marketing landing page, smart. For
> the system that moves **`{{DOMAIN}}`-critical** value — *revenue-critical* (payments, billing),
> *data-critical* (customer records, PII), or *safety-critical* (anything a person's wellbeing
> depends on) — "we vibe-coded it" is the sentence that ends the meeting. The second CTO says *"we
> do agentic engineering: every change is planned, validated, tested against evals, security-scanned,
> reviewed, and traceable from intent to deployment."* That is not slower AI — it is **AI you can put
> in front of an auditor.** This asset is how the second CTO's pipeline actually works on GitHub.

The shift underneath all of this is **Syntax → Intent.** Developers increasingly express *what* to
build and let the machine handle *how*. **Intent is the new interface.** But intent only becomes
trustworthy software when it passes through a system engineered to make it so.

---

## Your real product is the factory, not the feature

Here is the mindset change that separates teams that scale agentic work from teams that get burned by
it: **your primary output is no longer code. It is the system that produces code.**

That is the **Factory Model.** A high-performing agentic team invests in specs and context, the
agents themselves, the tests and quality gates, the feedback loops, and the guardrails. The feature
falls out of a well-built factory. A team that skips the factory and just points a powerful model at
its repo is back to vibe coding with extra steps.

The factory's engine is **the Harness.** The defining equation is **Agent = Model + Harness.** The
model is the raw capability; the harness is *everything wrapped around it* — the instruction and rule
files, the tools it can call, the sandboxes it runs in, the orchestration logic that routes and
dispatches it, the guardrails that constrain it, and the observability that lets you audit it. Swap a
better model into a poor harness and you get marginally better mistakes. Invest in the harness and a
modest model becomes reliable.

This is why the operating maxim is **"most agent failures are configuration (harness) failures, not
model failures."** When an agent goes off the rails, the instinct is to blame the model. Far more
often the rule file was vague, the tool was missing, the context was bloated, or no gate caught the
error. The harness is the fix — and the harness is **versioned like code**, reviewed like code, and
improved like code.

---

## The developer becomes an orchestrator running a fleet

If the team's product is a factory, the senior developer's job changes shape. They move from
**author** to **orchestrator**.

The literature draws a useful distinction. A **Conductor** works hands-on and real-time, directing an
agent inside the IDE for the hard, ambiguous slice of a problem. An **Orchestrator** works async:
they decompose a goal, **dispatch a fleet of agents in parallel**, and review what comes back. Good
engineers do both, switching modes as the work demands.

**Fleet Mode** is the part that changes the economics. Instead of driving one agent down a single
linear path, the orchestrator **decomposes** the work into independent units and runs **many agents
concurrently** — each in its own isolated environment, on its own branch, opening its own pull
request. The work **fans out**, runs in parallel, and then **fans in** to be integrated. A
**dependency graph** marks which units are parallel-safe and which must wait their turn, so
concurrency never becomes chaos.

This is the difference between *"I asked the AI to build a feature"* and *"I dispatched a team of
specialists who built, tested, secured, and reviewed it while I orchestrated."*

---

## The discipline that makes parallelism safe: Plan → Validate → Execute

Running many autonomous agents in parallel sounds reckless — and it would be, without one
non-negotiable discipline: **Plan → Validate → Execute.**

1. **Plan first.** Turn the intent into an explicit plan: the work broken into units, each with
   acceptance criteria and a definition of done, plus the dependency graph that says what can run in
   parallel and what cannot.
2. **Validate the plan — before any code.** Route the plan through a **rubber-duck /
   devil's-advocate** pass that attacks it: logic flaws, hidden dependencies between units, missing
   edge cases, *unsafe parallelization*, ambiguous specs. **Then a human approves it.** This is a
   **hard gate.**
3. **Only then, execute** — fan the validated plan out to the fleet.

The reason this matters more in fleet mode than in single-agent work: **the plan is what makes
fan-out safe.** Ten agents executing a flawed decomposition produce ten times the mess, ten branches
that don't integrate, ten PRs to untangle. Ten agents executing a *validated* decomposition produce a
feature. **You never parallelize an unvalidated plan.** The validation gate is not bureaucracy — it
is the safety rail that lets you turn the concurrency up.

---

## A day in the life of one intent

Watch a single sentence of intent become a deployed, traceable change — followed here through one
**worked example** (swap in the client's `{{DEMO_APP}}`). Each handoff names the agent doing the work
and the human gate it passes through. *(Agents and gates are defined in
[`02`](./02-agents-skills-harness.md); the full pipeline is in [`03`](./03-github-pipeline.md).)*

> 📌 **CALL-OUT — the intent (set to `{{DEMO_APP}}`).** *"Add rate limiting to `{{DEMO_APP}}` so a
> single client can't exhaust the service."* Example default `{{DEMO_APP}}`: a small REST API
> service. Swap in the client's real service boundary.

- **Plan.** The human **Orchestrator** states the intent. The **Planning Agent** turns it into a
  Work Plan — a set of Issues, each with acceptance criteria, a definition of done, and a test+eval
  strategy — plus a **dependency graph**: the rate-limiter middleware, the configuration surface, and
  the documentation can be built in parallel; the integration test depends on all three.
- **Validate** *(hard gate).* The **Rubber-Duck Agent** attacks the plan: *"What happens to
  in-flight requests when the limit is hit? Is the limiter store shared across instances? Have you
  marked the integration test as dependent, not parallel-safe?"* It returns revisions until the plan
  is sound. **A human approves the plan.** Nothing has been built yet. ⛔ **[HUMAN GATE: approve plan]**
- **Execute, in parallel.** The orchestrator dispatches a **fleet of Development Agents** —
  concurrently, capped at `{{FLEET_CONCURRENCY}}` — each taking one parallel-safe Issue, each on its
  own branch, each opening its own pull request. As the code lands, three gates run **per PR, in
  parallel**: the **Quality / Test Agent** writes and runs tests *and* evals; the **Security /
  Compliance Agent** triages scanning results and applies fixes; the **Code Review Agent** posts an
  AI first-pass review. The dependent unit (the integration test) waits for its predecessors, exactly
  as the graph dictates. ⛔ **[HUMAN GATE: approve PRs via CODEOWNERS]**
- **Integrate & deploy.** The parallel PRs **converge through a merge queue** that integrates them
  safely; integration tests and evals run on the combined result. The **Deployment Agent** ships to
  `{{DEPLOY_TARGET}}`, runs smoke tests, generates synthetic traffic, and reports a go/no-go signal.
  ⛔ **[HUMAN GATE: approve release]**

One sentence in; a deployed, tested, secured, reviewed, fully traceable change out — built by a fleet
working in parallel, gated by humans at exactly the three points where judgment matters.

---

## Where humans stay firmly in control

This is the opposite of a story about replacing engineers. It is a story about **moving their
judgment to where it pays off most.**

- **The 80% problem.** Agents produce ~80% of a feature fast. The last 20% — the edge cases, the
  awkward integration, the subtle correctness that depends on business context an agent doesn't have
  — is exactly where human judgment is decisive. The gates are placed to capture that 20%, not to
  rubber-stamp the 80%.
- **Evals, not demos.** A demo proves the happy path once. An **eval** proves behavior holds across
  cases, scores output quality, and checks the agent took the *right trajectory* — and it runs on
  every change. *"Set the bar at the eval, not the demo."* A feature isn't done because it worked in
  the meeting; it's done when it clears the evals.
- **Plan validation.** No code is written against a plan a human hasn't approved. The most expensive
  mistakes are prevented before a single line is generated.

Humans own the intent, the plan approval, the code approval, and the release. The fleet does the
labor between those gates.

---

## Why this is credible for any client

Strip away the vocabulary and what remains is a pipeline where **every change is traceable from
intent → plan → issues → PRs → checks → deploy**, where security scanning and review are built into
the path rather than bolted on after, and where the audit trail is a native byproduct of how the work
flows — not a report someone assembles later.

That is the durable framing for any client: *vibe-coding a system your business depends on — payments,
customer data, core operations, safety — raises alarms; **agentic engineering** — planned, validated,
parallelized under human-designed constraints with systematic verification — is a defensible,
auditable conversation.* The faster you want to go, the more the discipline is what earns you the
speed.

> 🔒 **IF HIGH-ASSURANCE.** For regulated or safety-critical clients, the same pipeline tightens
> rather than changes: split the **Security / Compliance Agent** out as a dedicated gate from day
> one; make plan-validation and release approvals mandatory, multi-party, and logged; require
> security and eval checks to pass before merge; and lean on the native traceability chain
> (intent → issue → plan-validation check → PR → checks → review → merge queue → deployment history)
> as your evidence base. The discipline that makes parallel agents *safe* is the same discipline that
> makes them *auditable* — which is why high-assurance teams should be the most interested, not the
> most hesitant.

---

*Next: [`02 · The Agents, their Skills & the Harness`](./02-agents-skills-harness.md) — the roster and
the concrete GitHub artifacts that make the harness real. Then
[`03 · The GitHub-Powered Pipeline`](./03-github-pipeline.md) — the factory in motion.*
