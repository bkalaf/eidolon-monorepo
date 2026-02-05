import { query } from "../db.js";
import {
  LAST_SEEN_TTL_MS,
  SESSION_DURATION_MS,
  SESSION_RENEW_THRESHOLD_MS,
  setSessionCookie,
} from "../auth/session.js";

const SESSION_COOKIE_NAME = "session";

export async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const result = await query(
      `
        SELECT s.*, u.email_verified
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = $1 AND s.expires_at > now()
      `,
      [sessionId]
    );

    if (!result.rowCount) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const session = result.rows[0];
    const now = Date.now();
    const lastSeenMs = new Date(session.last_seen_at).getTime();
    const expiresAtMs = new Date(session.expires_at).getTime();
    const updates = [];

    if (expiresAtMs - now < SESSION_RENEW_THRESHOLD_MS) {
      const newExpiresAt = new Date(now + SESSION_DURATION_MS);
      updates.push(
        query("UPDATE sessions SET expires_at = $1 WHERE id = $2", [
          newExpiresAt.toISOString(),
          sessionId,
        ])
      );
      setSessionCookie(res, sessionId, newExpiresAt);
    }

    if (now - lastSeenMs > LAST_SEEN_TTL_MS) {
      updates.push(
        query("UPDATE sessions SET last_seen_at = now() WHERE id = $1", [
          sessionId,
        ])
      );
    }

    if (updates.length) {
      await Promise.all(updates);
    }

    req.auth = {
      userId: session.user_id,
      emailVerified: session.email_verified,
      sessionId,
    };
    next();
  } catch (error) {
    console.error("requireAuth error", error);
    res.status(500).json({ error: "Unable to verify session" });
  }
}
