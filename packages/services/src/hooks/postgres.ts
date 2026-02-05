import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/eidolon";
const DEFAULT_POOL_SIZE = Number(process.env.POSTGRES_MAX_CONNECTIONS ?? 10);
const USE_SSL = process.env.POSTGRES_SSL === "true";

const pool = new Pool({
  connectionString: DEFAULT_DATABASE_URL,
  max: DEFAULT_POOL_SIZE,
  allowExitOnIdle: true,
  ...(USE_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

let initialized = false;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

function log(...args: Parameters<typeof console.log>) {
  console.log("[postgres]", ...args);
}

export async function connectPostgres() {
  if (initialized) {
    log("already connected");
    return pool;
  }

  log("connecting to", DEFAULT_DATABASE_URL);
  const client = await pool.connect();
  client.release();
  initialized = true;
  log("connected");
  return pool;
}

export function getPostgresPool() {
  return pool;
}

export function getPostgresDrizzle() {
  if (!drizzleInstance) {
    drizzleInstance = drizzle(pool);
  }
  return drizzleInstance;
}

export async function disconnectPostgres() {
  if (!initialized) {
    return;
  }

  await pool.end();
  drizzleInstance = null;
  initialized = false;
  log("disconnected");
}
