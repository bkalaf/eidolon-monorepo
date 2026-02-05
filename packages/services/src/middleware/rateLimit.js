const rateLimitStore = new Map();

function getKey(req, suffix) {
  return `${suffix}:${req.ip ?? "unknown"}`;
}

export function rateLimit(options = {}) {
  const limit = options.limit ?? 20;
  const windowMs = options.windowMs ?? 60 * 1000;
  const keyGenerator =
    options.keyGenerator ??
    ((req) => getKey(req, options.keyPrefix ?? "rl"));

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    entry.count += 1;
    if (entry.count > limit) {
      res.set("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    rateLimitStore.set(key, entry);
    next();
  };
}

// TODO: Swap this in-memory store for Redis, Cloudflare WAF, or native edge rate limiting.
