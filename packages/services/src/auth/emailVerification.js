import { query } from "../db.js";
import { hashToken } from "../crypto/tokens.js";

const APP_ORIGIN = process.env.APP_ORIGIN ?? "https://app.example.com";

export async function verifyEmailHandler(req, res) {
  const token = String(req.query?.token ?? "");
  if (!token) {
    res.redirect(`${APP_ORIGIN}/verified`);
    return;
  }

  const tokenHash = hashToken(token);

  try {
    const candidate = await query(
      `
        SELECT id
        FROM users
        WHERE email_verify_token_hash = $1
          AND email_verify_expires_at > now()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (candidate.rowCount) {
      await query(
        `
          UPDATE users
          SET email_verified = true,
              email_verify_token_hash = NULL,
              email_verify_expires_at = NULL
          WHERE id = $1
        `,
        [candidate.rows[0].id]
      );
    }
  } catch (error) {
    console.error("verifyEmailHandler", error);
    res.status(500).json({ error: "Unable to verify email" });
    return;
  }

  res.redirect(`${APP_ORIGIN}/verified`);
}
