import { randomUUID } from "node:crypto";
import { query } from "../db.js";

export const SESSION_COOKIE_NAME = "session";
export const REFRESH_COOKIE_NAME = "refresh";
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const SESSION_RENEW_THRESHOLD_MS = 6 * 60 * 60 * 1000;
export const LAST_SEEN_TTL_MS = 5 * 60 * 1000;
const MAX_SESSIONS_PER_USER = Math.max(
  1,
  Number(process.env.MAX_SESSIONS_PER_USER ?? 10)
);
const isSecure = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
export const REFRESH_TOKEN_DURATION_MS = 45 * 24 * 60 * 60 * 1000;

function buildCookieOptions(overrides = {}) {
  const opts = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    ...overrides,
  };

  if (COOKIE_DOMAIN) {
    opts.domain = COOKIE_DOMAIN;
  }

  return opts;
}

export function setSessionCookie(res, sessionId, expiresAt) {
  res.cookie(
    SESSION_COOKIE_NAME,
    sessionId,
    buildCookieOptions({
      path: "/",
      expires: expiresAt,
      maxAge: SESSION_DURATION_MS,
    })
  );
}

export function clearSessionCookie(res) {
  res.clearCookie(
    SESSION_COOKIE_NAME,
    buildCookieOptions({
      path: "/",
    })
  );
}

export function setRefreshCookie(res, token, expiresAt) {
  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    buildCookieOptions({
      path: "/auth/refresh",
      expires: expiresAt,
      maxAge: REFRESH_TOKEN_DURATION_MS,
    })
  );
}

export function clearRefreshCookie(res) {
  res.clearCookie(
    REFRESH_COOKIE_NAME,
    buildCookieOptions({
      path: "/auth/refresh",
    })
  );
}

export async function createSessionForUser({
  userId,
  res,
  rotatedFrom = null,
  userAgent = null,
  ip = null,
}) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await query(
    `
      INSERT INTO sessions (id, user_id, expires_at, last_seen_at, user_agent, ip, rotated_from)
      VALUES ($1, $2, $3, now(), $4, $5, $6)
    `,
    [
      sessionId,
      userId,
      expiresAt.toISOString(),
      userAgent,
      ip,
      rotatedFrom,
    ]
  );

  await enforceSessionLimit(userId);
  setSessionCookie(res, sessionId, expiresAt);

  return { sessionId, expiresAt };
}

async function enforceSessionLimit(userId) {
  await query(
    `
      DELETE FROM sessions
      WHERE user_id = $1
        AND id NOT IN (
          SELECT id
          FROM sessions
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        )
    `,
    [userId, MAX_SESSIONS_PER_USER]
  );
}
