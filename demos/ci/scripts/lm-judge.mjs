#!/usr/bin/env node
// LM-judge (OPTIONAL, NON-REQUIRED) — the agent-in-CI half of the evals gate.
//
// HONESTY / fork-PR policy: this is a LAYERED PATTERN and is deliberately OPTIONAL. The
// deterministic eval-rubric + tests are the REQUIRED gate. On public fork PRs there is no
// model token in scope, so this step must NO-OP cleanly (exit 0) rather than fail — never
// let an optional LM-judge block a merge.
//
// In CI the real LM call is made by the `actions/ai-inference` step against GitHub Models;
// this script is the local stand-in / wiring point. With no token it explains itself and
// exits 0. (It does not make a network call here — keeping T1 deterministic and offline.)
//
// Usage: node lm-judge.mjs [--input <summary.json>] [--json]

function hasModelToken() {
  return Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.MODELS_TOKEN);
}

function main() {
  const json = process.argv.includes('--json');
  const tokenPresent = hasModelToken();

  const report = {
    judge: 'lm-judge',
    enforcement: 'OPTIONAL / non-required — 🟨 advisory layered pattern (skips safely without a token)',
    tokenPresent,
    skipped: !tokenPresent,
    note: tokenPresent
      ? 'Token present: in CI, actions/ai-inference scores output against the rubric prompt. Local stand-in is advisory only.'
      : 'No model token in scope (e.g. fork PR): skipped. Deterministic eval-rubric + tests remain the REQUIRED gate.',
    pass: true,
  };

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(`lm-judge: ${tokenPresent ? 'advisory (token present)' : 'skipped (no token)'} — non-blocking`);
    console.log(`  ${report.note}`);
  }

  process.exitCode = 0; // never blocks
}

main();
