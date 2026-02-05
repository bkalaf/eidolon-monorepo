import { query } from "../db.js";
import { generateToken, hashToken } from "../crypto/tokens.js";
import { hashPassword } from "../crypto/argon.js";
import { sendPasswordResetEmail } from "../mailer/resend.js";

const APP_ORIGIN = process.env.APP_ORIGIN ?? "https://app.example.com";
const RESET_TOKEN_EXPIRATION_MS = 30 * 60 * 1000;

export async function passwordResetRequestHandler(req, res) {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email) {
    res.status(204).end();
    return;
  }

  const user = await query(
    `
      SELECT id
      FROM users
      WHERE email = $1 AND email_verified = true
      LIMIT 1
    `,
    [email]
  );

  if (!user.rowCount) {
    res.status(204).end();
    return;
  }

  const resetToken = generateToken();
  const resetHash = hashToken(resetToken);
  const resetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS);

  await query(
    `
      UPDATE users
      SET reset_token_hash = $1,
          reset_expires_at = $2
      WHERE id = $3
    `,
    [resetHash, resetExpiresAt.toISOString(), user.rows[0].id]
  );

  const resetLink = `${APP_ORIGIN}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(email, resetLink);
  } catch (error) {
    console.error("passwordResetRequestHandler", error);
  }

  res.status(204).end();
}

export async function passwordResetConfirmHandler(req, res) {
  const token = String(req.body?.token ?? "");
  const newPassword = String(req.body?.newPassword ?? "");

  if (!token || !newPassword) {
    res.status(400).json({ error: "Invalid token or password" });
    return;
  }

  const hashedToken = hashToken(token);
  const userResult = await query(
    `
      SELECT id
      FROM users
      WHERE reset_token_hash = $1
        AND reset_expires_at > now()
      LIMIT 1
    `,
    [hashedToken]
  );

  if (!userResult.rowCount) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }

  const userId = userResult.rows[0].id;
  const newPasswordHash = await hashPassword(newPassword);

  await query(
    `
      UPDATE users
      SET password_hash = $1,
          reset_token_hash = NULL,
          reset_expires_at = NULL
      WHERE id = $2
    `,
    [newPasswordHash, userId]
  );

  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  await query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId]
  );

  res.status(200).json({ ok: true });
}
