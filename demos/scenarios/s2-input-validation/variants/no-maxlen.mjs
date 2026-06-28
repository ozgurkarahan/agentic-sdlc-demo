// S2 NEGATIVE variant: NO length enforcement. Over-long URLs flow straight through to the
// route and get stored — the app's own validation only checks http/https, not length, so the
// garbage is persisted and a 201 is returned. The rubric must catch this (overlong-url-not-rejected).
export default function noMaxLen(req, res, next) {
  return next();
}
