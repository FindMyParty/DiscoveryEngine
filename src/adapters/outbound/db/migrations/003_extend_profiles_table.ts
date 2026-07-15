import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE profiles
    ADD COLUMN is_dm boolean NOT NULL DEFAULT false,
    ADD COLUMN is_player boolean NOT NULL DEFAULT true,
    ADD COLUMN is_remote boolean NOT NULL DEFAULT false,
    ADD COLUMN experience text NOT NULL DEFAULT 'beginner',
    ADD COLUMN latitude numeric(10, 7),
    ADD COLUMN longitude numeric(10, 7)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE profiles
    DROP COLUMN is_dm,
    DROP COLUMN is_player,
    DROP COLUMN is_remote,
    DROP COLUMN experience,
    DROP COLUMN latitude,
    DROP COLUMN longitude
  `.execute(db);
}
