import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logger.js";

export interface Database {
  profiles: {
    id: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  };
  suggestions: {
    id: string;
    discoverer_profile_id: string;
    suggested_profile_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  };
}

const pool = new Pool({ connectionString: env.DATABASE_URL });

// Without this listener, idle client errors are unhandled and crash the process.
pool.on("error", (err) => {
  logger.error({ err }, "PostgreSQL pool idle client error");
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

export async function checkPostgres(): Promise<"ok"> {
  await sql`SELECT 1`.execute(db);
  return "ok";
}

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
