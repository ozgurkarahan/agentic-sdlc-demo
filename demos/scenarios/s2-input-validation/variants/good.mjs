// S2 GOOD variant: a max-URL-length guard on POST /shorten → 400 + JSON { error }.
// Reads MAX_URL_LEN (the eval-rubric exports it from the scenario's meta.env). Scores full
// marks on the input-validation-contract rubric.
export default function maxUrlLengthGuard(req, res, next) {
  const max = Number(process.env.MAX_URL_LEN ?? 2048);
  if (req.method === 'POST' && req.path === '/shorten') {
    const url = req.body?.url;
    if (typeof url === 'string' && url.length > max) {
      return res.status(400).json({ error: `url exceeds max length of ${max}` });
    }
  }
  return next();
}
