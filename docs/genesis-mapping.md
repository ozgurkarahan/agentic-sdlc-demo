# Genesis ↔ Notre harness — note de mapping (1 page)

> **But.** Situer [`danielmeppiel/genesis`](https://github.com/danielmeppiel/genesis) par rapport à notre
> demo agentic-SDLC, nommer rigoureusement ce qu'on a déjà construit, et lister ce qu'on récupère.
> **Référence interne** — délibérément hors de l'asset white-label `docs/agentic-engineering-on-github/`
> pour ne pas en diluer le caractère client-agnostic. Source : Genesis `v0.4.0`, lu 2026-06-27.

## TL;DR

Genesis est une **discipline d'architecture pour primitives agentiques** : il porte le rôle d'architecte
logiciel (décomposition, contrats, préoccupations transverses) sur les systèmes où **le LLM est le
runtime**. Il produit un **design justifié** — patterns nommés + UML + test d'acceptation + `plan.md` —
*avant* d'écrire le markdown. Il **ne produit pas de code qui tourne**.

**Complémentarité, pas concurrence :** Genesis = **amont** (comment bien architecturer les primitives) ·
nous = **aval** (prouver que les gates *enforcent* vraiment, via la matrice runnable anti-théâtre).
Le skill est **Apache-2.0** (réutilisable sans friction) ; le livre compagnon *The Agentic SDLC Handbook*
est **CC BY-NC 4.0** (à citer/lier, pas à redistribuer).

## Les 6 primitives Genesis → nos artefacts (mapping 1:1)

| Primitive Genesis (Tier 0 substrat) | Ce qu'on a déjà | Où |
|---|---|---|
| **Persona Scoping File** | 7 personas (orchestrator, planning, rubber-duck, quality-test, security-compliance, code-review, deployment) | `docs/.../harness/agents/*.agent.md` |
| **Module Entrypoint** | procédures répétables | `.github/prompts/*.prompt.md` (template) |
| **Scope-Attached Rule File** | rule repo-wide + overlay sécurité | `AGENTS.md`, `.../agent-safety.instructions.md` |
| **Child-Thread Spawn** | fan-out fleet par vagues, paths non-chevauchants | `demos/orchestrator/dispatch.mjs` |
| **Trigger Orchestrator** | workflows event/label-déclenchés | `.github/workflows/*.yml`, gate `plan-approved` |
| **Plan Persistence** (B4 Plan Memento) | `CONTRACT.md` D0 gelé + `plan.md` | `demos/CONTRACT.md`, session `plan.md` |

## Patterns Genesis qu'on incarne déjà (sans les avoir nommés)

| Notre mécanique | Pattern Genesis | Note |
|---|---|---|
| planning + rubber-duck + approbation humaine **avant code** | **A1 Panel** (multi-lens) + boucle architecte (étapes 5–6) | lentilles indépendantes ⇒ contextes séparés |
| fan-out fleet, 3 unités ∥ + U4 ordonnée (DAG), 1 path par unité | **B1 Fan-Out + Synthesizer** borné par DAG + Child-Thread Spawn avec handoff explicite (path-scope) | hand-off via artefacts, pas mémoire supposée |
| chaque `echo` du harness remplacé par une vraie commande CI | **S7 Deterministic Tool Bridge** + **A9 Supervised Execution** + **S4 Validation Decorator** | la couture LLM↔déterministe |
| dispatch conditionné au label `plan-approved` | **A6 Event-Driven** / **A10 Governed Outer Loop** | *shape* seulement — voir honnêteté ci-dessous |
| recharger le plan + ré-injecter le but à chaque tour | **B8 Attention Anchor** + **B4 Plan Memento** | contre la dérive sur sessions longues |

## Le point d'alignement le plus fort (et le plus protecteur)

Genesis martèle : **« markdown qui steere un LLM ≠ enforcement ; l'enforcement réel = rulesets / required
checks / required reviews / Environments ».** C'est **exactement** notre tier-map d'honnêteté
(`CONTRACT.md` §5) et nos labels `native` / `ci-job` / `local-assertion` / `external`. En particulier,
notre « plan-approved gate » est `local-assertion` / orchestration — **jamais** un gate natif pré-code.
Genesis valide ce choix : citer son cadrage **renforce** notre garde-fou anti-overclaim (la pire
régression possible selon le CONTRACT).

## Ce qu'on récupère concrètement

1. **Vocabulaire + catalogue de patterns** (23 design + 9 archi + 4 refactor) pour upgrader l'asset :
   passer de « on a des agents » à « on applique **A1 Panel** parce que… ». Enrichit les talking-points.
2. **Exemples PR-review `02` / `04` / `05`** (advisory vs verdict) — calqués sur nos stages **Review + PR**
   (`code-review` + `rubber-duck`). Justifications d'architecture prêtes à citer, y compris le
   *considered-and-rejected* (même esprit que nos labels d'honnêteté).
3. **L'« architect's loop »** (`plan.md` non-négociable + reload à chaque tour) — formalise notre règle
   *Plan-Before-Coding* et la discipline *Plan → Validate → Execute* de `AGENTS.md`.
4. **Le livre compagnon** *The Agentic SDLC Handbook* — autorité sur notre sujet exact, à référencer
   dans `docs/` (lien, pas copie : CC BY-NC).

## Prochaines options (non engagées)

- **(b)** Installer le skill `/genesis` dans le repo (`npx skills add danielmeppiel/genesis` ou
  `apm install danielmeppiel/genesis`) pour le démo-er **live** comme stage « Plan & Design ».
- **(c)** Piller le catalogue de patterns pour enrichir les talking-points de l'asset.
- **Wiki** : graduer ce mapping vers `~/projects/memory/wiki/` (lesson/pattern) à l'end-session.

## Références

| Quoi | Où |
|---|---|
| Repo Genesis (Apache-2.0) | https://github.com/danielmeppiel/genesis |
| Primitives / patterns | `skills/genesis/assets/{primitives,design-patterns,architectural-patterns,refactor-patterns}.md` |
| Exemples PR-review | `skills/genesis/examples/{02,04,05}-*.md` |
| Livre (CC BY-NC 4.0) | https://danielmeppiel.github.io/agentic-sdlc-handbook/ |
| Notre keystone | `demos/CONTRACT.md` · `docs/agentic-engineering-on-github/harness/AGENTS.md` |
