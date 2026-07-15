import { db } from "./client.js";
import { Suggestion, type SuggestionStatusType } from "../../../domain/entities/suggestion.js";
import type { ISuggestionRepository } from "../../../domain/ports/outbound/suggestion-repository.port.js";
import { logger } from "../../../shared/logger.js";

export class PostgresSuggestionRepository implements ISuggestionRepository {
  #toEntity(row: {
    id: string;
    discoverer_profile_id: string;
    suggested_profile_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  }): Suggestion {
    return Suggestion.fromPersistence(row);
  }

  async save(suggestion: Suggestion): Promise<Suggestion> {
    logger.debug(
      { suggestionId: suggestion.id, discovererId: suggestion.discovererProfileId, suggestedId: suggestion.suggestedProfileId },
      "Saving suggestion",
    );

    const row = await db
      .insertInto("suggestions")
      .values({
        id: suggestion.id,
        discoverer_profile_id: suggestion.discovererProfileId,
        suggested_profile_id: suggestion.suggestedProfileId,
        status: suggestion.status,
        created_at: suggestion.createdAt,
        updated_at: suggestion.updatedAt,
      })
      .onConflict((oc) =>
        oc
          .columns(["discoverer_profile_id", "suggested_profile_id"])
          .doUpdateSet({ updated_at: (eb) => eb.ref("excluded.updated_at") }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.debug({ suggestionId: suggestion.id }, "Suggestion saved");
    return this.#toEntity(row);
  }

  async findByPair(discovererId: string, suggestedId: string): Promise<Suggestion | null> {
    const row = await db
      .selectFrom("suggestions")
      .selectAll()
      .where("discoverer_profile_id", "=", discovererId)
      .where("suggested_profile_id", "=", suggestedId)
      .executeTakeFirst();

    if (!row) return null;
    return this.#toEntity(row);
  }

  async updateStatusForMatchedPair(
    profileId1: string,
    profileId2: string,
    status: SuggestionStatusType,
  ): Promise<void> {
    logger.debug({ profileId1, profileId2, status }, "Updating suggestion status for matched pair");

    await db
      .updateTable("suggestions")
      .set({ status, updated_at: new Date() })
      .where((eb) =>
        eb.or([
          eb.and([
            eb("discoverer_profile_id", "=", profileId1),
            eb("suggested_profile_id", "=", profileId2),
          ]),
          eb.and([
            eb("discoverer_profile_id", "=", profileId2),
            eb("suggested_profile_id", "=", profileId1),
          ]),
        ]),
      )
      .execute();

    logger.debug({ profileId1, profileId2, status }, "Suggestion status updated");
  }
}
