// Quality-test NEGATIVE variant: "missing-retry-after".
// Correctly returns 429 at the right threshold, but FORGETS the `Retry-After` header — so a
// well-behaved client can't tell when to retry. The rubric's retry_after_present check
// FAILS (2/3), turning the evals gate RED. Proves the eval enforces the FULL output
// contract, not just "some 429 happened".
const hits = new Map();

export default function rateLimitNoHeader(req, res, next) {
  const max = Number(process.env.RATE_LIMIT_MAX ?? 3);
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000);
  const key = req.ip || req.socket?.remoteAddress || 'global';
  const now = Date.now();

  let entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    hits.set(key, entry);
  }
  entry.count += 1;

  if (entry.count > max) {
    // BUG (intentional): no Retry-After header set.
    return res.status(429).json({ error: 'rate_limited' });
  }
  return next();
}
