import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("matches")
    .addColumn("profile_id_1", "uuid", (col) =>
      col.notNull().references("profiles.id").onDelete("cascade"),
    )
    .addColumn("profile_id_2", "uuid", (col) =>
      col.notNull().references("profiles.id").onDelete("cascade"),
    )
    .addColumn("matched_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("matches_pkey", ["profile_id_1", "profile_id_2"])
    .addCheckConstraint("matches_ordering_check", sql`profile_id_1 < profile_id_2`)
    .execute();

  await db.schema
    .createIndex("matches_profile_id_2_idx")
    .on("matches")
    .column("profile_id_2")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("matches_profile_id_2_idx").execute();
  await db.schema.dropTable("matches").execute();
}
