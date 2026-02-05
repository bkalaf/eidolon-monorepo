import { createError, defineEventHandler } from "h3";
import { handleCors } from "../../hooks/cors";
import { getActiveSession } from "../../hooks/session";

export default defineEventHandler(async (event) => {
  const corsResponse = handleCors(event);
  if (corsResponse) {
    return corsResponse;
  }

  const session = await getActiveSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  return { user: session.user };
});
