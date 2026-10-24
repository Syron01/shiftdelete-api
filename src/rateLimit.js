// API istemcileri için IP başına hız sınırı: tek bir saldırgan istemcinin
// upstream'i yorup IP'nin yasaklanmasına yol açmasını engeller.
function apiRateLimit({ windowMs = 60000, max = 60 } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }
  let lastSweep = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      lastSweep = now;
    }

    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let rec = hits.get(key);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(key, rec);
    }
    rec.count++;

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - rec.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(rec.resetAt / 1000)));

    if (rec.count > max) {
      const retryAfter = Math.max(1, Math.ceil((rec.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'RateLimitExceeded',
        message: `IP başına dakikada ${max} istek sınırı aşıldı. ${retryAfter} saniye sonra tekrar deneyin.`,
      });
    }
    next();
  };
}

module.exports = { apiRateLimit };
