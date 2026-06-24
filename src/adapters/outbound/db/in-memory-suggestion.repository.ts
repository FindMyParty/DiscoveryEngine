import { Suggestion, type SuggestionStatusType } from "../../../domain/entities/suggestion.js";
import type { ISuggestionRepository } from "../../../domain/ports/outbound/suggestion-repository.port.js";

export class InMemorySuggestionRepository implements ISuggestionRepository {
  #suggestions: Map<string, Suggestion> = new Map();

  async save(suggestion: Suggestion): Promise<Suggestion> {
    const existing = await this.findByPair(
      suggestion.discovererProfileId,
      suggestion.suggestedProfileId,
    );
    if (existing) {
      return existing;
    }
    this.#suggestions.set(suggestion.id, suggestion);
    return suggestion;
  }

  async findByPair(discovererId: string, suggestedId: string): Promise<Suggestion | null> {
    for (const suggestion of this.#suggestions.values()) {
      if (
        suggestion.discovererProfileId === discovererId &&
        suggestion.suggestedProfileId === suggestedId
      ) {
        return suggestion;
      }
    }
    return null;
  }

  async updateStatusForMatchedPair(
    profileId1: string,
    profileId2: string,
    status: SuggestionStatusType,
  ): Promise<void> {
    for (const suggestion of this.#suggestions.values()) {
      const isForwardPair =
        suggestion.discovererProfileId === profileId1 &&
        suggestion.suggestedProfileId === profileId2;
      const isReversePair =
        suggestion.discovererProfileId === profileId2 &&
        suggestion.suggestedProfileId === profileId1;

      if (isForwardPair || isReversePair) {
        suggestion.status = status;
        suggestion.updatedAt = new Date();
      }
    }
  }

  clear(): void {
    this.#suggestions.clear();
  }
}
