// Quality-test NEGATIVE variant: "no-429".
// Looks like a limiter (counts requests) but NEVER returns 429 — it always calls next().
// This is the classic "passes unit tests, does nothing useful" failure. The eval rubric's
// limiting_present check FAILS (0/3 → 1/3), so the evals gate goes RED even though the
// app's own tests might be green. Proves the eval catches behavioural no-ops.
const hits = new Map();

export default function fakeRateLimit(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'global';
  hits.set(key, (hits.get(key) ?? 0) + 1);
  // BUG (intentional): never enforces the limit.
  return next();
}
