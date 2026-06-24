import type { Suggestion, SuggestionStatusType } from "../../entities/suggestion.js";

export interface ISuggestionRepository {
  save(suggestion: Suggestion): Promise<Suggestion>;
  findByPair(discovererId: string, suggestedId: string): Promise<Suggestion | null>;
  updateStatusForMatchedPair(
    profileId1: string,
    profileId2: string,
    status: SuggestionStatusType,
  ): Promise<void>;
}
