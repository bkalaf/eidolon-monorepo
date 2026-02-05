import { randomBytes, createHash } from "node:crypto";

function base64url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateToken(bytes = 32) {
  return base64url(randomBytes(bytes));
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
