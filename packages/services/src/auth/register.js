import { query } from "../db.js";
import { hashPassword } from "../crypto/argon.js";
import { generateToken, hashToken } from "../crypto/tokens.js";
import { sendVerifyEmail } from "../mailer/resend.js";
import { createSessionForUser } from "./session.js";

const EMAIL_VERIFY_EXPIRATION_MS = 60 * 60 * 1000;
const API_ORIGIN = process.env.API_ORIGIN ?? "https://api.example.com";

export async function registerHandler(req, res) {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const verifyToken = generateToken();
  const verifyTokenHash = hashToken(verifyToken);
  const verifyExpiresAt = new Date(Date.now() + EMAIL_VERIFY_EXPIRATION_MS);

  try {
    const insert = await query(
      `
        INSERT INTO users (email, password_hash, email_verify_token_hash, email_verify_expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [email, passwordHash, verifyTokenHash, verifyExpiresAt.toISOString()]
    );

    const userId = insert.rows[0].id;
    await createSessionForUser({
      userId,
      res,
      userAgent: req.get("User-Agent") ?? null,
      ip: req.ip,
    });

    const verifyLink = `${API_ORIGIN}/auth/verify-email?token=${verifyToken}`;

    try {
      await sendVerifyEmail(email, verifyLink);
    } catch (error) {
      console.error("Unable to send verification email", error);
    }
  } catch (error) {
    if (error?.code === "23505") {
      res.status(201).json({ ok: true });
      return;
    }
    console.error("registerHandler", error);
    res.status(500).json({ error: "Unable to register" });
    return;
  }

  res.status(201).json({ ok: true });
}
