import { query } from "../db.js";
import { hashToken } from "../crypto/tokens.js";
import {
  clearSessionCookie,
  clearRefreshCookie,
} from "./session.js";

export async function logoutHandler(req, res) {
  const sessionId = req.cookies?.session;
  const refreshToken = req.cookies?.refresh;

  try {
    if (sessionId) {
      await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    }

    if (refreshToken) {
      await query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1",
        [hashToken(refreshToken)]
      );
    }
  } catch (error) {
    console.error("logoutHandler", error);
  }

  clearSessionCookie(res);
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function logoutAllHandler(req, res) {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await query(
      "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
  } catch (error) {
    console.error("logoutAllHandler", error);
  }

  clearSessionCookie(res);
  clearRefreshCookie(res);
  res.status(204).end();
}
