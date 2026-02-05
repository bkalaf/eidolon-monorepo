import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be defined before starting the API");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.POSTGRES_MAX_CONNECTIONS ?? 12),
});

pool.on("error", (error) => {
  console.error("Postgres idle client error:", error);
});

export async function query(text, params) {
  return pool.query(text, params);
}

export default pool;
