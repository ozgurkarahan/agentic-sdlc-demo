#!/usr/bin/env node
// Tier-1 validation runner — the deterministic harness that proves every agent/gate's
// ARTIFACT CONTRACT holds: each positive fixture passes and, crucially, each NEGATIVE
// fixture is CAUGHT. A negative that slips through is "theater" and fails the suite.
//
// HONESTY (per the plan's validation scope): T1 validates harness LOGIC + artifact
// contracts with seeded fixtures — NOT live-agent quality. Live agent behaviour is only
// exercised in T3 (real @copilot fleet). Each row is labelled by enforcement type so
// nothing is presented as a stronger guarantee than it is:
//   🟩 native (GitHub primitive)  🟦 ci-job / local-assertion (our logic)
//   🟨 advisory (non-blocking)    ⛔ external (needs coding-agent / Models / human)
//
// Drivers map a fixture's semantic `input` (CONTRACT §4) to the real D2 check scripts:
//   plan-lint · path-scope · trajectory · eval-rubric · pin-check · doc-coupling · smoke · dispatch
//
// Usage: node demos/validate/run.mjs [--json] [--filter <agent>]
// Exit 0 only if every fixture's actual outcome === its expected outcome (and expected
// signals are present). Exit 1 if any fixture is mis-handled (theater or false block).

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, '..');
const ROOT = resolve(DEMOS, '..');
const FIXTURES = join(DEMOS, 'fixtures');
const CI_SCRIPTS = join(DEMOS, 'ci', 'scripts');
const SAMPLE_APP = join(DEMOS, 'sample-app');
const APP_DIST = join(SAMPLE_APP, 'dist', 'app.js');

const ENFORCE_EMOJI = {
  native: '🟩 native',
  'ci-job': '🟦 ci-job',
  'local-assertion': '🟦 local',
  advisory: '🟨 advisory',
  external: '⛔ external',
};

function parseArgs(argv) {
  const args = { json: false, filter: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--filter') args.filter = argv[++i];
  }
  return args;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function loadFixtures() {
  return walk(FIXTURES)
    .map((p) => {
      try {
        const json = JSON.parse(readFileSync(p, 'utf8'));
        return json && json.agent && json.expect ? { path: p, ...json } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.agent + a.case).localeCompare(b.agent + b.case));
}

function runScript(scriptName, args) {
  const script = join(CI_SCRIPTS, scriptName);
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status ?? 2, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

function parseJson(stdout) {
  try { return JSON.parse(stdout); } catch { return null; }
}

const split = (arr) => (arr ?? []).join(',');

// Each driver returns { outcome: 'pass'|'blocked'|'error', signals: string[] }.
const drivers = {
  'plan-lint'(fx) {
    const r = runScript('plan-lint.mjs', ['--input', fx.path, '--json']);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    return { outcome: j.pass ? 'pass' : 'blocked', signals: j.signals ?? [] };
  },

  'path-scope'(fx) {
    const { declaredPaths, changedPaths } = fx.input;
    const r = runScript('path-scope-check.mjs', ['--declared', split(declaredPaths), '--changed', split(changedPaths), '--json']);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    return { outcome: j.pass ? 'pass' : 'blocked', signals: j.pass ? [] : ['path-violation'] };
  },

  trajectory(fx) {
    const { declaredPaths, changedPaths, requiredTest } = fx.input;
    const a = ['--declared', split(declaredPaths), '--changed', split(changedPaths), '--json'];
    if (requiredTest) a.push('--required-test', requiredTest);
    const r = runScript('trajectory-check.mjs', a);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    const signals = [];
    if (!j.checks?.touched_declared) signals.push('untouched-declared');
    if (!j.checks?.required_test_added) signals.push('missing-required-test');
    return { outcome: j.pass ? 'pass' : 'blocked', signals };
  },

  'eval-rubric'(fx) {
    const variantMap = {
      good: 'good.mjs',
      'no-429': 'no-429.mjs',
      'missing-retry-after': 'missing-retry-after.mjs',
    };
    const variant = resolve(FIXTURES, 'quality-test', variantMap[fx.input.appVariant]);
    const r = runScript('eval-rubric.mjs', ['--app', APP_DIST, '--variant', variant, '--json']);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    const signals = [];
    if (!j.checks?.limiting_present) signals.push('no-429');
    else if (!j.checks?.threshold_correct) signals.push('wrong-threshold');
    if (!j.checks?.retry_after_present) signals.push('missing-retry-after');
    return { outcome: j.pass ? 'pass' : 'blocked', signals };
  },

  'pin-check'(fx) {
    const manifest = resolve(ROOT, fx.input.manifest);
    const r = runScript('pin-check.mjs', ['--package', manifest, '--json']);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    const kinds = [...new Set((j.findings ?? []).map((f) => f.kind))];
    return { outcome: j.pass ? 'pass' : 'blocked', signals: kinds };
  },

  'doc-coupling'(fx) {
    const r = runScript('doc-coupling-check.mjs', ['--changed', split(fx.input.changedPaths), '--json']);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    // Advisory: the gate "fires" when flagged, even though it exits 0 (non-blocking).
    return { outcome: j.flagged ? 'blocked' : 'pass', signals: j.signals ?? [] };
  },

  smoke(fx) {
    const a = ['--app', APP_DIST, '--json'];
    if (fx.input.variant) a.push('--variant', resolve(dirname(fx.path), fx.input.variant));
    const r = runScript('smoke-check.mjs', a);
    const j = parseJson(r.stdout);
    if (!j) return { outcome: 'error', signals: [] };
    return { outcome: j.pass ? 'pass' : 'blocked', signals: j.signals ?? [] };
  },

  async dispatch(fx) {
    const mod = await import(pathToFileURL(join(DEMOS, 'orchestrator', 'dispatch.mjs')).href);
    const plan = {
      intent: 'fixture',
      planApproved: fx.input.planApprovedLabel === true,
      units: fx.input.units,
    };
    let decision;
    try {
      decision = mod.decideDispatch(plan);
    } catch (e) {
      return { outcome: 'error', signals: [e.message] };
    }
    if (!decision.approved) return { outcome: 'blocked', signals: ['refused-unapproved'] };
    return { outcome: decision.dispatch.length > 0 ? 'pass' : 'blocked', signals: ['dispatched'] };
  },
};

function ensureBuilt() {
  if (existsSync(APP_DIST)) return;
  const tsc = join(SAMPLE_APP, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!existsSync(tsc)) {
    throw new Error(`sample app not built and tsc not found. Run \`npm install && npm run build\` in ${SAMPLE_APP}.`);
  }
  console.log('• sample app not built — compiling (tsc)…');
  execFileSync(process.execPath, [tsc, '-p', join(SAMPLE_APP, 'tsconfig.json')], { stdio: 'inherit' });
}

async function main() {
  const args = parseArgs(process.argv);
  ensureBuilt();

  let fixtures = loadFixtures();
  if (args.filter) fixtures = fixtures.filter((f) => f.agent === args.filter);

  const results = [];
  for (const fx of fixtures) {
    const driver = drivers[fx.driver];
    if (!driver) {
      results.push({ fx, actual: { outcome: 'error', signals: [] }, ok: false, reason: `unknown driver "${fx.driver}"` });
      continue;
    }
    const actual = await driver(fx);
    const outcomeOk = actual.outcome === fx.expect.outcome;
    const signalsOk = (fx.expect.signals ?? []).every((s) => actual.signals.includes(s));
    const ok = outcomeOk && signalsOk;
    let reason = 'ok';
    if (!outcomeOk) {
      reason = fx.polarity === 'negative' ? 'THEATER: negative not caught' : 'FALSE-BLOCK: positive wrongly blocked';
    } else if (!signalsOk) {
      reason = `signal mismatch: expected [${(fx.expect.signals ?? []).join(', ')}] got [${actual.signals.join(', ')}]`;
    }
    results.push({ fx, actual, ok, reason });
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  if (args.json) {
    process.stdout.write(JSON.stringify({
      total: results.length,
      passed,
      failed,
      results: results.map((r) => ({
        agent: r.fx.agent, case: r.fx.case, polarity: r.fx.polarity,
        enforcement: r.fx.enforcement, driver: r.fx.driver,
        expected: r.fx.expect.outcome, actual: r.actual.outcome,
        signals: r.actual.signals, ok: r.ok, reason: r.reason,
      })),
    }, null, 2) + '\n');
  } else {
    printMatrix(results);
  }

  process.exitCode = failed === 0 ? 0 : 1;
}

function printMatrix(results) {
  console.log('\n  Tier-1 harness validation — artifact contracts (seeded fixtures, not live-agent quality)\n');
  const byAgent = new Map();
  for (const r of results) {
    if (!byAgent.has(r.fx.agent)) byAgent.set(r.fx.agent, []);
    byAgent.get(r.fx.agent).push(r);
  }
  for (const [agent, rows] of byAgent) {
    console.log(`  ${agent}`);
    for (const r of rows) {
      const mark = r.ok ? '✅' : '❌';
      const pol = r.fx.polarity === 'negative' ? 'neg' : 'pos';
      const enf = ENFORCE_EMOJI[r.fx.enforcement] ?? r.fx.enforcement;
      const detail = r.ok
        ? `${r.fx.expect.outcome}`
        : `${r.reason}  (expected ${r.fx.expect.outcome}, got ${r.actual.outcome})`;
      console.log(`    ${mark} [${pol}] ${enf.padEnd(12)} ${r.fx.case}`);
      console.log(`         → ${detail}`);
    }
    console.log('');
  }

  // Human gates are not executable in T1 — surface them as INFO so the matrix is complete.
  console.log('  human-gates (not executed in T1 — native/external; verified in T2/T3)');
  console.log('    ℹ️ [info] 🟩 native     plan-approved label — required before dispatch (human)');
  console.log('    ℹ️ [info] 🟩 native     CODEOWNERS review — required to merge each PR (human)');
  console.log('    ℹ️ [info] 🟩 native     Environment approval — required before release (human)');
  console.log('');

  // The Deployment gate's TRUE enforcement is a split label, only fully present at T2 (Azure).
  // T1 above proves the 🟦 rollback LOGIC with a local fixture; the live deploy adds the rest.
  console.log('  tier-2 live deployment (Azure Container Apps — verified by deploy.yml, not in T1)');
  console.log('    ℹ️ [info] 🟩 native     production Environment reviewer + GitHub Deployment record');
  console.log('    ℹ️ [info] 🟦 layered    live /healthz smoke (retries) + revision-traffic rollback');
  console.log('    ℹ️ [info] ⛔ external    Azure Container Apps — external dependency, never a native GitHub block');
  console.log('');

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const negatives = results.filter((r) => r.fx.polarity === 'negative');
  const negCaught = negatives.filter((r) => r.ok).length;
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  ${failed === 0 ? '✅ ALL GREEN' : '❌ FAILURES'}  ${passed}/${results.length} fixtures correct`);
  console.log(`  negatives caught (anti-theater): ${negCaught}/${negatives.length}`);
  if (failed > 0) {
    console.log('\n  Mis-handled fixtures:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`    ✗ ${r.fx.agent}/${r.fx.case} — ${r.reason}`);
    }
  }
  console.log('');
}

main().catch((err) => {
  console.error(`validate: ERROR ${err.stack ?? err.message}`);
  process.exitCode = 2;
});
