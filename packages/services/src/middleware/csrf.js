import { generateToken } from "../crypto/tokens.js";

const CSRF_COOKIE_NAME = "csrf";
const CSRF_TOKEN_BYTES = 32;
const CSRF_MAX_AGE_MS = 60 * 60 * 1000;
const isSecure = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

function buildCookieOptions() {
  const opts = {
    httpOnly: false,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_MAX_AGE_MS,
  };

  if (COOKIE_DOMAIN) {
    opts.domain = COOKIE_DOMAIN;
  }

  return opts;
}

export function issueCsrfToken(req, res) {
  const token = generateToken(CSRF_TOKEN_BYTES);
  res.cookie(CSRF_COOKIE_NAME, token, buildCookieOptions());
  res.status(204).end();
}

export function requireCsrf(req, res, next) {
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const tokenFromHeader = req.get("x-csrf-token");

  if (
    !tokenFromCookie ||
    !tokenFromHeader ||
    tokenFromCookie !== tokenFromHeader
  ) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}
