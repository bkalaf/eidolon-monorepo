const APP_ORIGIN = process.env.APP_ORIGIN ?? "https://app.example.com";
const API_ORIGIN = process.env.API_ORIGIN ?? "https://api.example.com";
const allowList = [APP_ORIGIN, API_ORIGIN];

export function originCheck(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("Origin");
  if (!origin) {
    // allow non-browser clients (curl, etc.) but CSRF protections still apply
    return next();
  }

  if (!allowList.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  next();
}
