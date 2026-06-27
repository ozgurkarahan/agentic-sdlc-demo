#!/usr/bin/env node
// demos/orchestrator/cli.mjs
// Thin CLI around the pure dispatcher core. Loads a plan.json, prints the dispatch decision, and
// (only with --assign, a T3 / ⛔ external action) assigns parallel-safe units to the Copilot coding
// agent via `gh`. T1/T2 never need --assign.
//
// Usage:
//   node demos/orchestrator/cli.mjs --plan demos/orchestrator/example-plan.json
//   node demos/orchestrator/cli.mjs --plan <plan.json> --landed U1,U2
//   node demos/orchestrator/cli.mjs --plan <plan.json> --assign --repo owner/name --issues U1=12,U2=13,U3=14
//
import { readFileSync } from 'node:fs';
import { decideDispatch, formatDecision } from './dispatch.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plan') args.plan = argv[++i];
    else if (a === '--landed') args.landed = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--assign') args.assign = true;
    else if (a === '--repo') args.repo = argv[++i];
    else if (a === '--issues') args.issues = argv[++i];
    else if (a === '--json') args.json = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.plan) {
    console.error('error: --plan <path> is required');
    process.exit(2);
  }
  const plan = JSON.parse(readFileSync(args.plan, 'utf8'));
  const decision = decideDispatch(plan, { landed: args.landed ?? [] });

  if (args.json) {
    console.log(JSON.stringify(decision, null, 2));
  } else {
    console.log(formatDecision(decision));
  }

  if (args.assign) {
    if (!decision.approved) {
      console.error('\nrefusing to --assign: plan is not approved');
      process.exit(1);
    }
    assignViaGh(decision, plan, args); // ⛔ external dependency (T3 only)
  }

  // Exit non-zero when an unapproved plan was asked to dispatch, so CI/scripts can detect the gate.
  process.exit(decision.approved ? 0 : 1);
}

// ⛔ EXTERNAL DEPENDENCY (T3). Assigns each dispatched unit's Issue to the Copilot coding agent.
// Kept side-effecting and isolated; never invoked by the T1 validator.
function assignViaGh(decision, plan, args) {
  const issueMap = Object.fromEntries(
    (args.issues ?? '').split(',').map((kv) => kv.split('=')).filter((p) => p.length === 2),
  );
  if (!args.repo) {
    console.error('error: --assign requires --repo owner/name');
    process.exit(2);
  }
  // Lazy import so T1 never loads child_process.
  import('node:child_process').then(({ execFileSync }) => {
    for (const id of decision.dispatch) {
      const issue = issueMap[id];
      if (!issue) {
        console.error(`skip ${id}: no --issues mapping (expected ${id}=<issue-number>)`);
        continue;
      }
      console.log(`assigning ${id} → issue #${issue} to @copilot in ${args.repo}`);
      execFileSync('gh', ['issue', 'edit', issue, '--repo', args.repo, '--add-assignee', '@copilot'], {
        stdio: 'inherit',
      });
    }
  });
}

main();
