import { db } from "./client.js";
import { Profile } from "../../../domain/entities/profile.js";
import type { IProfileRepository } from "../../../domain/ports/outbound/profile-repository.port.js";
import { logger } from "../../../shared/logger.js";

export class PostgresProfileRepository implements IProfileRepository {
  #toEntity(row: {
    id: string;
    is_active: boolean;
    is_dm: boolean;
    is_player: boolean;
    is_remote: boolean;
    experience: string;
    latitude: string | null;
    longitude: string | null;
    created_at: Date;
    updated_at: Date;
  }): Profile {
    return Profile.fromPersistence(row);
  }

  async upsert(profile: Profile): Promise<Profile> {
    logger.debug({ profileId: profile.id }, "Upserting profile");

    const row = await db
      .insertInto("profiles")
      .values({
        id: profile.id,
        is_active: profile.isActive,
        is_dm: profile.isDM,
        is_player: profile.isPlayer,
        is_remote: profile.isRemote,
        experience: profile.experience,
        latitude: profile.latitude,
        longitude: profile.longitude,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          is_active: (eb) => eb.ref("excluded.is_active"),
          is_dm: (eb) => eb.ref("excluded.is_dm"),
          is_player: (eb) => eb.ref("excluded.is_player"),
          is_remote: (eb) => eb.ref("excluded.is_remote"),
          experience: (eb) => eb.ref("excluded.experience"),
          latitude: (eb) => eb.ref("excluded.latitude"),
          longitude: (eb) => eb.ref("excluded.longitude"),
          updated_at: (eb) => eb.ref("excluded.updated_at"),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.debug({ profileId: profile.id }, "Profile upserted");
    return this.#toEntity(row);
  }

  async findById(id: string): Promise<Profile | null> {
    logger.debug({ profileId: id }, "Finding profile by id");

    const row = await db
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    logger.debug({ profileId: id, found: !!row }, "Profile lookup complete");
    if (!row) return null;
    return this.#toEntity(row);
  }
}
