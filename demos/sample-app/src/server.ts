import { createApp, type CreateAppOptions } from './app.js';
import { config } from './config.js';

const extraMiddleware: NonNullable<CreateAppOptions['extraMiddleware']> = [];

// Deployment demo — env-gated liveness fault. Two independent switches let the deploy workflow
// exercise BOTH rollback variants against a REAL deployed revision (never a local fixture):
//   FAULT_HEALTHZ=1       → staging smoke fails fast ⇒ deploy stops, production is never touched.
//   FAULT_HEALTHZ_PROD=1  → a candidate that PASSES staging (FAULT_HEALTHZ=0) but fails the
//                           production 0%-traffic canary smoke ⇒ capture-last-good + traffic restore.
// GET /healthz returns 500 if EITHER is '1'; the default (both unset) path stays healthy (200).
// Honest + decoupled from app logic.
if (process.env.FAULT_HEALTHZ === '1' || process.env.FAULT_HEALTHZ_PROD === '1') {
  const reason =
    process.env.FAULT_HEALTHZ_PROD === '1'
      ? 'injected prod-canary smoke failure (FAULT_HEALTHZ_PROD)'
      : 'injected smoke failure (FAULT_HEALTHZ)';
  extraMiddleware.push((request, response, next) => {
    if (request.path === '/healthz' || request.path === '/health') {
      response.status(500).json({ status: 'down', reason });
      return;
    }
    next();
  });
}

const app = createApp({ extraMiddleware });

app.listen(config.port, () => {
  console.log(`URL shortener listening on port ${config.port}`);
});
