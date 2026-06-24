import { db } from "./client.js";
import { Profile } from "../../../domain/entities/profile.js";
import type { IProfileRepository } from "../../../domain/ports/outbound/profile-repository.port.js";

export class PostgresProfileRepository implements IProfileRepository {
  #toEntity(row: { id: string; is_active: boolean; created_at: Date; updated_at: Date }): Profile {
    return Profile.fromPersistence(row);
  }

  async upsert(profile: Profile): Promise<Profile> {
    const row = await db
      .insertInto("profiles")
      .values({
        id: profile.id,
        is_active: profile.isActive,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          is_active: (eb) => eb.ref("excluded.is_active"),
          updated_at: (eb) => eb.ref("excluded.updated_at"),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.#toEntity(row);
  }

  async findById(id: string): Promise<Profile | null> {
    const row = await db
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!row) return null;
    return this.#toEntity(row);
  }

  async findUnsuggestedActiveProfiles(discovererId: string): Promise<Profile[]> {
    const rows = await db
      .selectFrom("profiles")
      .selectAll()
      .where("is_active", "=", true)
      .where("id", "!=", discovererId)
      .where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom("suggestions")
              .select("id")
              .whereRef("suggested_profile_id", "=", "profiles.id")
              .where("discoverer_profile_id", "=", discovererId)
              .where("status", "in", ["pending", "matched"]),
          ),
        ),
      )
      .execute();

    return rows.map((row) => this.#toEntity(row));
  }
}
