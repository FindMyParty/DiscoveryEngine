import { db } from "./client.js";
import { Match } from "../../../domain/entities/match.js";
import type { IMatchRepository } from "../../../domain/ports/outbound/match-repository.port.js";
import { logger } from "../../../shared/logger.js";

export class PostgresMatchRepository implements IMatchRepository {
  #toEntity(row: {
    profile_id_1: string;
    profile_id_2: string;
    matched_at: Date;
  }): Match {
    return Match.fromPersistence(row);
  }

  async save(match: Match): Promise<Match> {
    logger.debug(
      { profileId1: match.profileId1, profileId2: match.profileId2 },
      "Saving match",
    );

    const row = await db
      .insertInto("matches")
      .values({
        profile_id_1: match.profileId1,
        profile_id_2: match.profileId2,
        matched_at: match.matchedAt,
      })
      .onConflict((oc) =>
        oc
          .columns(["profile_id_1", "profile_id_2"])
          .doUpdateSet({ matched_at: (eb) => eb.ref("excluded.matched_at") }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.debug({ profileId1: match.profileId1, profileId2: match.profileId2 }, "Match saved");
    return this.#toEntity(row);
  }

  async findByProfileId(profileId: string): Promise<Match[]> {
    logger.debug({ profileId }, "Finding matches by profile id");

    const rows = await db
      .selectFrom("matches")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("profile_id_1", "=", profileId),
          eb("profile_id_2", "=", profileId),
        ]),
      )
      .execute();

    logger.debug({ profileId, count: rows.length }, "Matches fetched by profile id");
    return rows.map((row) => this.#toEntity(row));
  }
}
