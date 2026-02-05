import { createError, defineEventHandler } from "h3";
import { handleCors } from "../../hooks/cors";
import { ensureCsrf } from "../../hooks/csrf";
import { clearSessionCookies, getActiveSession, revokeSessionById } from "../../hooks/session";

export default defineEventHandler(async (event) => {
  const corsResponse = handleCors(event);
  if (corsResponse) {
    return corsResponse;
  }

  ensureCsrf(event);

  const session = await getActiveSession(event);
  if (!session) {
    clearSessionCookies(event);
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  await revokeSessionById(session.sessionId);
  clearSessionCookies(event);

  return { success: true };
});
