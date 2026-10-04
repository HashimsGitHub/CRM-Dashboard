import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pool?: Pool };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
}

// Lazily created so `next build` does not need a database connection.
function getPool(): Pool {
  return (globalForDb.__pool ??= createPool());
}

let _db: ReturnType<typeof makeDb> | undefined;
function makeDb() {
  return drizzle(getPool(), { schema });
}

export const db = new Proxy({} as ReturnType<typeof makeDb>, {
  get(_t, prop, receiver) {
    return Reflect.get((_db ??= makeDb()), prop, receiver);
  },
});

export type Db = typeof db;
export { schema };
