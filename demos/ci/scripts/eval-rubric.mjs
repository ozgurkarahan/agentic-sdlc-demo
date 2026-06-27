#!/usr/bin/env node
// Deterministic output-rubric eval for the rate-limit story.
//
// This is the OUTPUT RUBRIC half of the "evals" gate (a LAYERED PATTERN run as an
// Actions job / local assertion — NOT a native GitHub product). It boots the sample
// app, optionally mounts a candidate rate-limit middleware variant via the
// `createApp({ extraMiddleware })` factory, fires a burst of requests, and scores the
// observed behaviour against three objective checks:
//
//   1. limiting_present   — a 429 appears once the allowance is exhausted
//   2. threshold_correct  — the FIRST 429 lands exactly at request (max + 1), not earlier/never
//   3. retry_after_present— every 429 carries a parseable numeric `Retry-After` header
//
// PASS = all three. This is what makes the Quality/Test NEGATIVE fixtures bite:
//   - a "no-429" impl (passes unit tests, never limits) → limiting_present FAIL
//   - a "missing-retry-after" impl (429 but no header)  → retry_after_present FAIL
//   - an off-by-one / 200-instead-of-429 impl           → threshold_correct FAIL
//
// Usage:
//   node eval-rubric.mjs --app <dist/app.js> [--variant <middleware.mjs>] [--max 3] [--route /healthz] [--json]
//
// T1 (local validator): mount a fixture variant onto the unchanged app to simulate
//   good/bad implementations, e.g. --variant fixtures/quality-test/good.mjs
// T2 (real PR in the dedicated repo): omit --variant; the app already wires its own
//   limiter, so the rubric grades the actual PR implementation.

import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));

// Single request over a fresh, non-pooled socket. Using node:http with `agent: false`
// (instead of global fetch/undici) avoids keep-alive sockets that race process teardown
// on Windows and abort with a libuv assertion.
function request(port, route, method, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = data
      ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) }
      : {};
    const req = http.request(
      { host: '127.0.0.1', port, path: route, method, agent: false, headers },
      (response) => {
        response.resume();
        response.on('end', () =>
          res({ status: response.statusCode, retryAfter: response.headers['retry-after'] ?? null }),
        );
        response.on('error', rej);
      },
    );
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}

function parseArgs(argv) {
  const args = { max: 3, route: '/healthz', json: false, variant: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--app') args.app = argv[++i];
    else if (a === '--variant') args.variant = argv[++i];
    else if (a === '--max') args.max = Number(argv[++i]);
    else if (a === '--route') args.route = argv[++i];
    else if (a === '--method') args.method = argv[++i];
  }
  // Default app path: ../../sample-app/dist/app.js relative to this script.
  if (!args.app) args.app = resolve(HERE, '..', '..', 'sample-app', 'dist', 'app.js');
  return args;
}

async function importDefault(path) {
  const mod = await import(pathToFileURL(resolve(path)).href);
  return mod.default ?? mod.createApp ?? mod;
}

async function main() {
  const args = parseArgs(process.argv);

  // The rubric controls the threshold; variants are expected to read these envs.
  process.env.RATE_LIMIT_MAX = String(args.max);
  process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ?? '60000';

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
  const method = args.method ?? 'GET';

  const burst = args.max + 2; // enough to cross the threshold and confirm it sticks
  const observed = [];
  try {
    for (let i = 0; i < burst; i += 1) {
      const body = method === 'POST' ? { url: 'https://example.com' } : null;
      const r = await request(port, args.route, method, body);
      observed.push({ index: i + 1, status: r.status, retryAfter: r.retryAfter });
    }
  } finally {
    await new Promise((res) => server.close(res));
  }

  const limited = observed.filter((o) => o.status === 429);
  const firstLimited = observed.find((o) => o.status === 429)?.index ?? null;
  const retryAfterOk = limited.length > 0 && limited.every((o) => {
    const n = Number(o.retryAfter);
    return o.retryAfter != null && Number.isFinite(n) && n >= 0;
  });

  const checks = {
    limiting_present: limited.length > 0,
    threshold_correct: firstLimited === args.max + 1,
    retry_after_present: retryAfterOk,
  };
  const score = Object.values(checks).filter(Boolean).length;
  const pass = score === 3;

  const report = {
    rubric: 'rate-limit-output',
    enforcement: 'required CI job (T2) / local assertion (T1) — 🟦 layered eval, not a native gate',
    app: args.app,
    variant: args.variant,
    max: args.max,
    route: args.route,
    firstLimitedIndex: firstLimited,
    observed,
    checks,
    score: `${score}/3`,
    pass,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(`eval-rubric: ${pass ? 'PASS ✅' : 'FAIL ❌'}  (${score}/3)  variant=${args.variant ?? '(none / app as-is)'}`);
    for (const [k, v] of Object.entries(checks)) {
      console.log(`  ${v ? '✓' : '✗'} ${k}`);
    }
    if (!pass) {
      console.log(`  first 429 at request: ${firstLimited ?? 'never'} (expected ${args.max + 1})`);
      console.log(`  statuses: ${observed.map((o) => o.status).join(', ')}`);
    }
  }

  process.exitCode = pass ? 0 : 1;
}

main().catch((err) => {
  console.error(`eval-rubric: ERROR ${err.message}`);
  process.exitCode = 2;
});
