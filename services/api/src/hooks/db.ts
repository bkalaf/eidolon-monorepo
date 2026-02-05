import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config";

let pool: Pool | null = null;
let client: ReturnType<typeof drizzle> | null = null;

export const getPostgresPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: config.POSTGRES_MAX_CONNECTIONS,
      ssl: config.POSTGRES_SSL ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
};

export const getDrizzleClient = () => {
  if (!client) {
    client = drizzle(getPostgresPool());
  }
  return client;
};
