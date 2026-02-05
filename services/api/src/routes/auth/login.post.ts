import { createError, defineEventHandler, readBody } from "h3";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDrizzleClient } from "../../hooks/db";
import { handleCors } from "../../hooks/cors";
import { createSessionForUser } from "../../hooks/session";
import { users } from "../../../db/schema";

export default defineEventHandler(async (event) => {
  const corsResponse = handleCors(event);
  if (corsResponse) {
    return corsResponse;
  }

  const body = (await readBody(event)) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password;

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: "Email and password are required" });
  }

  const db = getDrizzleClient();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash
    })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  const passwordMatches = await argon2.verify(user.passwordHash, password);
  if (!passwordMatches) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  await createSessionForUser(event, user.id);

  return {
    user: {
      id: user.id,
      email: user.email
    }
  };
});
