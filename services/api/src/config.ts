const ensureEnv = (name: string, value?: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const splitList = (value?: string) =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const TTL_FALLBACK = 1209600;
const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  DATABASE_URL: ensureEnv("DATABASE_URL", process.env.DATABASE_URL),
  AUTH_PEPPER: ensureEnv("AUTH_PEPPER", process.env.AUTH_PEPPER),
  SESSION_TTL_SECONDS: parseNumber(process.env.SESSION_TTL_SECONDS, TTL_FALLBACK),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  POSTGRES_MAX_CONNECTIONS: parseNumber(process.env.POSTGRES_MAX_CONNECTIONS, 10),
  POSTGRES_SSL: process.env.POSTGRES_SSL?.toLowerCase() === "true",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  COOKIE_SECURE:
    process.env.COOKIE_SECURE?.toLowerCase() === "true" ||
    (process.env.NODE_ENV ?? "").toLowerCase() === "production",
  CORS_ALLOWED_ORIGINS: splitList(process.env.CORS_ALLOWED_ORIGINS),
  SESSION_COOKIE_NAME: "session",
  CSRF_COOKIE_NAME: "csrf"
};

export const isProduction = config.NODE_ENV === "production";

const allowedOriginSet = new Set(config.CORS_ALLOWED_ORIGINS);
export const isOriginAllowed = (origin?: string) => {
  if (!origin) return false;
  if (allowedOriginSet.size === 0) return false;
  return allowedOriginSet.has(origin);
};
