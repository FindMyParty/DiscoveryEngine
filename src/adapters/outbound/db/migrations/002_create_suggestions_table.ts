import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("suggestions")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("discoverer_profile_id", "uuid", (col) =>
      col.notNull().references("profiles.id").onDelete("cascade"),
    )
    .addColumn("suggested_profile_id", "uuid", (col) =>
      col.notNull().references("profiles.id").onDelete("cascade"),
    )
    .addColumn("status", "varchar(50)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("suggestions_pair_idx")
    .on("suggestions")
    .columns(["discoverer_profile_id", "suggested_profile_id"])
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("suggestions_pair_idx").execute();
  await db.schema.dropTable("suggestions").execute();
}
