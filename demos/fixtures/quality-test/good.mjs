// Quality-test fixture variant: a CORRECT rate-limit middleware.
// Reads RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS (the eval-rubric sets them), returns 429 +
// a numeric Retry-After once the per-window allowance is exhausted. Scores 3/3 on the rubric.
const hits = new Map(); // key -> { count, resetAt }

export default function rateLimit(req, res, next) {
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
    const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'rate_limited', retryAfter });
  }
  return next();
}
