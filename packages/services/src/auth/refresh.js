import { query } from "../db.js";
import { generateToken, hashToken } from "../crypto/tokens.js";
import {
  REFRESH_TOKEN_DURATION_MS,
  createSessionForUser,
  setRefreshCookie,
  clearRefreshCookie,
  clearSessionCookie,
} from "./session.js";

function unauthorized(res) {
  clearSessionCookie(res);
  clearRefreshCookie(res);
  res.status(401).json({ error: "Authentication required" });
}

async function revokeAllForUser(userId) {
  await query(
    `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );

  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

export async function refreshHandler(req, res) {
  const rawToken = req.cookies?.refresh;
  if (!rawToken) {
    unauthorized(res);
    return;
  }

  const tokenHash = hashToken(rawToken);

  try {
    const existing = await query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!existing.rowCount) {
      unauthorized(res);
      return;
    }

    const tokenRow = existing.rows[0];

    if (tokenRow.revoked_at) {
      await revokeAllForUser(tokenRow.user_id);
      unauthorized(res);
      return;
    }

    if (new Date(tokenRow.expires_at) <= new Date()) {
      await query(`DELETE FROM refresh_tokens WHERE id = $1`, [tokenRow.id]);
      unauthorized(res);
      return;
    }

    await query(
      `UPDATE refresh_tokens SET revoked_at = now(), last_used_at = now() WHERE id = $1`,
      [tokenRow.id]
    );

    const newToken = generateToken();
    const newHash = hashToken(newToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION_MS);

    await query(
      `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        tokenRow.user_id,
        newHash,
        newExpiresAt.toISOString(),
        req.get("User-Agent") ?? null,
        req.ip,
      ]
    );

    setRefreshCookie(res, newToken, newExpiresAt);

    await createSessionForUser({
      userId: tokenRow.user_id,
      res,
      userAgent: req.get("User-Agent") ?? null,
      ip: req.ip,
      rotatedFrom: req.cookies?.session ?? null,
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("refreshHandler", error);
    res.status(500).json({ error: "Unable to refresh session" });
  }
}
