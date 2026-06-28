// S2 NEGATIVE variant: rejects over-long URLs but VIOLATES THE RESPONSE CONTRACT — it returns
// a 400 with a plain-text body instead of the required JSON { error }. This passes a naive
// "did we get a 400?" check but must be caught by the contract assertion (overlong-error-not-json),
// proving the oracle checks the response SHAPE, not just the status code.
export default function plaintextError(req, res, next) {
  const max = Number(process.env.MAX_URL_LEN ?? 2048);
  if (req.method === 'POST' && req.path === '/shorten') {
    const url = req.body?.url;
    if (typeof url === 'string' && url.length > max) {
      return res.status(400).type('text/plain').send('url too long');
    }
  }
  return next();
}
