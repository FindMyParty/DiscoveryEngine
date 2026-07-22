import { Kysely, PostgresDialect, sql, type ColumnType } from "kysely";
import { Pool } from "pg";
import { env } from "../../../config/env.js";
import { logger } from "../../../shared/logger.js";

export interface Database {
  profiles: {
    id: string;
    is_active: boolean;
    is_dm: boolean;
    is_player: boolean;
    is_remote: boolean;
    experience: string;
    latitude: ColumnType<string | null, number | null, number | null>;
    longitude: ColumnType<string | null, number | null, number | null>;
    created_at: Date;
    updated_at: Date;
  };
  matches: {
    profile_id_1: string;
    profile_id_2: string;
    matched_at: Date;
  };
}

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on("connect", () => {
  logger.debug("PostgreSQL pool: new client connected");
});

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
