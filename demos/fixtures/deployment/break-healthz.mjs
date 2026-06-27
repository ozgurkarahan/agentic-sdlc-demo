// Deployment NEGATIVE variant: "break-healthz".
// A fault-injecting middleware that makes the liveness probe fail (GET /healthz → 500).
// Mounted by smoke-check.mjs to simulate a bad build reaching the smoke stage. The smoke
// probe expects 200, sees 500, and returns NO-GO with rollback:true — proving the
// Deployment gate's rollback logic actually fires (not theater).
export default function breakHealthz(req, res, next) {
  if (req.path === '/healthz' || req.path === '/health') {
    return res.status(500).json({ status: 'down', reason: 'injected smoke failure' });
  }
  return next();
}
