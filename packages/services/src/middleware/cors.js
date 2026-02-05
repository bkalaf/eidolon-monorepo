const APP_ORIGIN = process.env.APP_ORIGIN ?? "https://app.example.com";
const API_ORIGIN = process.env.API_ORIGIN ?? "https://api.example.com";
const allowedOrigins = new Set([APP_ORIGIN, API_ORIGIN]);

export function corsMiddleware(req, res, next) {
  const origin = req.get("Origin");
  if (origin) {
    if (!allowedOrigins.has(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-CSRF-Token"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
