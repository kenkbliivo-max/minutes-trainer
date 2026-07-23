import { Pool } from "pg";

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}
