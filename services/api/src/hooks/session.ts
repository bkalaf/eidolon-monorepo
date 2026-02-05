import { H3Event, getCookie, setCookie } from "h3";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { eq, gt, isNull, and } from "drizzle-orm";
import { getDrizzleClient } from "./db";
import { sessions, users } from "../../db/schema";
import { config } from "../config";

const hashToken = (token: string) =>
  createHash("sha256").update(`${token}${config.AUTH_PEPPER}`).digest("hex");

const getCookieOptions = () => {
  const expires = new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000);
  return {
    path: "/",
    secure: config.COOKIE_SECURE,
    sameSite: "lax" as const,
    maxAge: config.SESSION_TTL_SECONDS,
    expires,
    domain: config.COOKIE_DOMAIN || undefined
  };
};

const getClientIp = (event: H3Event) => {
  const forwarded = event.node.req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return event.node.req.socket?.remoteAddress || null;
};

export type ActiveSession = {
  sessionId: string;
  userId: string;
  user: {
    id: string;
    email: string;
  };
};

export const setSessionCookies = (event: H3Event, sessionToken: string, csrfToken: string) => {
  const base = getCookieOptions();
  setCookie(event, config.SESSION_COOKIE_NAME, sessionToken, {
    ...base,
    httpOnly: true
  });
  setCookie(event, config.CSRF_COOKIE_NAME, csrfToken, {
    ...base,
    httpOnly: false
  });
};

export const clearSessionCookies = (event: H3Event) => {
  const base = {
    path: "/",
    secure: config.COOKIE_SECURE,
    sameSite: "lax" as const,
    domain: config.COOKIE_DOMAIN || undefined,
    expires: new Date(0),
    maxAge: 0
  };
  setCookie(event, config.SESSION_COOKIE_NAME, "", {
    ...base,
    httpOnly: true
  });
  setCookie(event, config.CSRF_COOKIE_NAME, "", {
    ...base,
    httpOnly: false
  });
};

export const createSessionForUser = async (event: H3Event, userId: string) => {
  const token = randomBytes(48).toString("hex");
  const hashedToken = hashToken(token);
  const csrfToken = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.SESSION_TTL_SECONDS * 1000);
  const drizzle = getDrizzleClient();
  await drizzle.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashedToken,
    expiresAt,
    ip: getClientIp(event),
    userAgent: event.node.req.headers["user-agent"] || null
  }).run();
  setSessionCookies(event, token, csrfToken);
  return { token, csrfToken };
};

export const revokeSessionById = async (sessionId: string) => {
  const drizzle = getDrizzleClient();
  await drizzle
    .update(sessions)
    .set({
      revokedAt: new Date()
    })
    .where(eq(sessions.id, sessionId));
};

export const getActiveSession = async (event: H3Event): Promise<ActiveSession | null> => {
  const token = getCookie(event, config.SESSION_COOKIE_NAME);
  if (!token) {
    return null;
  }
  const hashed = hashToken(token);
  const drizzle = getDrizzleClient();
  const now = new Date();
  const [session] = await drizzle
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      user: {
        id: users.id,
        email: users.email
      }
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashed),
        gt(sessions.expiresAt, now),
        isNull(sessions.revokedAt)
      )
    )
    .limit(1);

  if (!session) {
    return null;
  }

  await drizzle
    .update(sessions)
    .set({ lastSeenAt: now })
    .where(eq(sessions.id, session.sessionId));

  return session;
};
