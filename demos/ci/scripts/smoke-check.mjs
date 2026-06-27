#!/usr/bin/env node
// Smoke-check — the deterministic go/no-go behind the Deployment gate.
//
// Boots the sample app (optionally with a fault-injecting variant), probes a liveness
// route, and decides go / no-go. On no-go it reports `rollback: true` — the signal the
// Deployment NEGATIVE fixture (failing-smoke build) must trip.
//
// Enforcement: 🟦 local harness assertion (T1) / 🟩 Environment reviewer + deployment
// history (T2). In T1 this proves the rollback LOGIC fires; T2 proves the platform blocks.
//
// Uses node:http with `agent: false` + process.exitCode (no global fetch/undici) to avoid
// the Windows keep-alive socket teardown crash — same pattern as eval-rubric.mjs.
//
// Usage:
//   node smoke-check.mjs --app <dist/app.js> [--variant <break-healthz.mjs>] [--route /healthz] [--expect 200] [--json]

import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));

function request(port, route) {
  return new Promise((res, rej) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: route, method: 'GET', agent: false },
      (response) => {
        response.resume();
        response.on('end', () => res({ status: response.statusCode }));
        response.on('error', rej);
      },
    );
    req.on('error', rej);
    req.end();
  });
}

function parseArgs(argv) {
  const args = { route: '/healthz', expect: 200, json: false, variant: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--app') args.app = argv[++i];
    else if (a === '--variant') args.variant = argv[++i];
    else if (a === '--route') args.route = argv[++i];
    else if (a === '--expect') args.expect = Number(argv[++i]);
    else if (a === '--input') args.input = argv[++i];
  }
  if (!args.app) args.app = resolve(HERE, '..', '..', 'sample-app', 'dist', 'app.js');
  return args;
}

async function importDefault(path) {
  const mod = await import(pathToFileURL(resolve(path)).href);
  return mod.default ?? mod;
}

async function main() {
  const args = parseArgs(process.argv);

  // A fixture may carry its variant/route in an `input` block (validator convention).
  if (args.input) {
    const { readFileSync } = await import('node:fs');
    const f = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
    const inp = f.input ?? f;
    if (inp.variant) args.variant = resolve(dirname(resolve(args.input)), inp.variant);
    if (inp.route) args.route = inp.route;
    if (inp.expect != null) args.expect = Number(inp.expect);
  }

  const appMod = await import(pathToFileURL(resolve(args.app)).href);
  const createApp = appMod.createApp ?? appMod.default;
  if (typeof createApp !== 'function') {
    throw new Error(`Could not load createApp() from ${args.app}. Build the sample app first (npm run build).`);
  }

  const extraMiddleware = [];
  if (args.variant) {
    const mw = await importDefault(args.variant);
    if (typeof mw !== 'function') {
      throw new Error(`Variant ${args.variant} must default-export an Express RequestHandler.`);
    }
    extraMiddleware.push(mw);
  }

  const app = createApp({ extraMiddleware });
  const server = await new Promise((res) => {
    const s = app.listen(0, '127.0.0.1', () => res(s));
  });
  const { port } = server.address();

  let observed;
  try {
    observed = await request(port, args.route);
  } finally {
    await new Promise((res) => server.close(res));
  }

  const smokePass = observed.status === args.expect;
  const decision = smokePass ? 'go' : 'no-go';
  const report = {
    check: 'smoke',
    enforcement: 'local harness (T1) / Environment reviewer + deployment history (T2) — 🟦/🟩',
    app: args.app,
    variant: args.variant,
    route: args.route,
    expect: args.expect,
    observedStatus: observed.status,
    decision,
    rollback: !smokePass,
    signals: smokePass ? [] : ['rollback', 'no-go'],
    pass: smokePass,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(`smoke-check: ${smokePass ? 'GO ✅' : 'NO-GO ❌ (rollback)'}  ${args.route} → ${observed.status} (expected ${args.expect})`);
  }

  process.exitCode = smokePass ? 0 : 1;
}

main().catch((err) => {
  console.error(`smoke-check: ERROR ${err.message}`);
  process.exitCode = 2;
});
