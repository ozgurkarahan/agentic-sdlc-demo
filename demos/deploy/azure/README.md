# Azure deploy — the Deployment agent's real Tier-2 target

This folder makes the **Deployment** lifecycle agent *real*: a merge to the live repo's `master`
deploys the URL-shortener to **Azure Container Apps**, runs a **live** `/healthz` smoke, pauses for a
**production reviewer**, promotes with a **0%-traffic canary → traffic shift**, and **rolls back** on a
failed smoke — recording a GitHub **Deployment** in history. **No secrets** anywhere (OIDC only).

## Honest enforcement label (the demo's core rule)
The Deployment gate is **not** one uniform "blocks". It is a split:

| Part | Label | What actually enforces it |
|---|---|---|
| Production approval + deployment record | 🟩 **native** | GitHub **Environment** required reviewer + Deployments API |
| Live smoke + revision-traffic rollback | 🟦 **layered** | our `deploy.yml` orchestration (not a platform block) |
| The compute itself | ⛔ **external** | Azure Container Apps (an external dependency) |

Claiming Azure or the smoke as "native GitHub enforcement" would re-introduce the exact overclaim this
whole asset corrects. Keep the split.

## What gets created (Sweden Central)
```
rg-agentic-sdlc-demo                resource group
log-agentic-sdlc                    Log Analytics workspace (ACA requires one)
cae-agentic-sdlc                    Container Apps environment
ca-urlshortener-staging             app · ingress :3000 · max-replicas 1
ca-urlshortener-prod                app · ingress :3000 · max-replicas 1 · multiple-revision
agentic-sdlc-demo-gha               Entra app reg + OIDC federated creds (env-scoped) + RG-scoped role
```
* **Two apps** (not one with revisions) so a bad candidate never takes prod traffic.
* **max-replicas 1** because the URL-shortener store is in-memory / per-replica.
* **OIDC subjects are environment-scoped** — `repo:OWNER/REPO:environment:staging|production`. There is
  **no `pull_request` credential** (a fork token would otherwise be trusted on a public repo).
* Role = **Container Apps Contributor on the RG only** (no role-assignment rights, no broad Contributor).

## Prerequisites
1. `az login` and the `containerapp` extension (the script adds it).
2. The live repo exists (run the D10 step first) — needed for OIDC subjects + repo variables.
3. `gh` authenticated with a **workflow-scoped** token for repo variables (the script falls back to the
   keyring token automatically if the active one lacks scope). Use `-SkipRepoVariables` to provision
   Azure before the repo exists, then re-run.

## Run
```powershell
# Stand up everything (idempotent — safe to re-run):
./provision.ps1 -Repo '<your-org>/agentic-sdlc-demo-live'

# Provision Azure before the repo exists, then set variables later:
./provision.ps1 -SkipRepoVariables

# Tear everything down — zero residual spend AND zero residual trust (verified):
./teardown.ps1                       # waits for the RG delete + verifies
./teardown.ps1 -DeletePackage        # also delete the GHCR image
./teardown.ps1 -KeepRepoSide -NoWait # Azure only, async
```

`provision.ps1` writes these **repo variables** (non-secret, public-safe) consumed by `deploy.yml`:
`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RG`, `AZURE_LOCATION`, `ACA_ENV`,
`STAGING_APP`, `PROD_APP`.

## GitHub Environments (create once, after the repo exists)
```bash
# staging — auto-deploy, no reviewer
gh api -X PUT repos/OWNER/REPO/environments/staging

# production — REQUIRED reviewer = you (this is the 🟩 native release gate)
gh api -X PUT repos/OWNER/REPO/environments/production \
  -f "reviewers[][type]=User" -F "reviewers[][id]=<your-numeric-user-id>"
```

## Prove the rollback is real (not theater)
Dispatch the deploy workflow with the fault input — it deploys a **real faulted live revision**
(`FAULT_HEALTHZ=1` → `/healthz` returns 500). The live staging smoke returns **NO-GO**, the job goes
RED, and **production is never reached** (so prod traffic stays on the last-good revision):
```bash
gh workflow run Deploy --repo OWNER/REPO -f inject_fault=true
```
A failed deploy is **RED**, never a stale green — that is the anti-theater contract.

## Idempotency & safety
* Every `provision.ps1` step checks existence first; re-running is a no-op.
* `teardown.ps1` removes the RG **and** the Entra app reg/federated creds **and** the repo
  variables/Environments, then runs a verification query and prints PASS / leftover per surface.
* Idle cost is ~0: both apps scale to zero (`min-replicas 0`); only Log Analytics ingestion is billed.
