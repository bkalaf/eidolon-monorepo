import { query } from "../db.js";
import { verifyPassword } from "../crypto/argon.js";
import { generateToken, hashToken } from "../crypto/tokens.js";
import {
  REFRESH_TOKEN_DURATION_MS,
  createSessionForUser,
  setRefreshCookie,
  clearRefreshCookie,
} from "./session.js";

export async function loginHandler(req, res) {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const rememberMe = Boolean(req.body?.rememberMe);

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const users = await query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [email]
    );

    if (!users.rowCount) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = users.rows[0];
    const passwordMatches = await verifyPassword(user.password_hash, password);

    if (!passwordMatches) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    await createSessionForUser({
      userId: user.id,
      res,
      userAgent: req.get("User-Agent") ?? null,
      ip: req.ip,
      rotatedFrom: req.cookies?.session ?? null,
    });

    if (rememberMe) {
      const refreshToken = generateToken();
      const refreshHash = hashToken(refreshToken);
      const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION_MS);

      await query(
        `
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          user.id,
          refreshHash,
          refreshExpiresAt.toISOString(),
          req.get("User-Agent") ?? null,
          req.ip,
        ]
      );

      setRefreshCookie(res, refreshToken, refreshExpiresAt);
    } else {
      clearRefreshCookie(res);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("loginHandler", error);
    res.status(500).json({ error: "Unable to authenticate" });
  }
}
