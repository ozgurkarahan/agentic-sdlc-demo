import { createApp, type CreateAppOptions } from './app.js';
import { config } from './config.js';

const extraMiddleware: NonNullable<CreateAppOptions['extraMiddleware']> = [];

// Deployment demo — env-gated liveness fault. Setting FAULT_HEALTHZ=1 on a deployed
// revision makes GET /healthz return 500, so the live smoke probe returns NO-GO and the
// deploy workflow rolls production traffic back to the last-good revision. This proves the
// Deployment gate's rollback fires against a REAL deployed revision (not a local fixture),
// while the default (unset) path stays healthy (200). Honest + decoupled from the app logic.
if (process.env.FAULT_HEALTHZ === '1') {
  extraMiddleware.push((request, response, next) => {
    if (request.path === '/healthz' || request.path === '/health') {
      response.status(500).json({ status: 'down', reason: 'injected smoke failure (FAULT_HEALTHZ)' });
      return;
    }
    next();
  });
}

const app = createApp({ extraMiddleware });

app.listen(config.port, () => {
  console.log(`URL shortener listening on port ${config.port}`);
});
