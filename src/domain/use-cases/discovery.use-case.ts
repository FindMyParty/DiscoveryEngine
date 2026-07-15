import { Profile } from "../entities/profile.js";
import { Suggestion, SuggestionStatus } from "../entities/suggestion.js";
import type { IDiscoveryUseCase, ProfileUpdatedPayload } from "../ports/inbound/discovery-use-case.port.js";
import type { IProfileRepository } from "../ports/outbound/profile-repository.port.js";
import type { ISuggestionRepository } from "../ports/outbound/suggestion-repository.port.js";
import type { IEventPublisher } from "../ports/outbound/event-publisher.port.js";

const EVENTS = Object.freeze({
  SUGGESTIONS_LISTED: "discovery.suggestion.listed",
});

export interface IDiscoveryMetrics {
  recordDiscoveryTriggered(): void;
  recordSuggestionsCreated(count: number): void;
}

interface DiscoveryUseCaseDeps {
  profileRepository: IProfileRepository;
  suggestionRepository: ISuggestionRepository;
  eventPublisher: IEventPublisher;
  metrics: IDiscoveryMetrics;
}

export class DiscoveryUseCase implements IDiscoveryUseCase {
  readonly #profileRepository: IProfileRepository;
  readonly #suggestionRepository: ISuggestionRepository;
  readonly #eventPublisher: IEventPublisher;
  readonly #metrics: IDiscoveryMetrics;

  constructor({ profileRepository, suggestionRepository, eventPublisher, metrics }: DiscoveryUseCaseDeps) {
    this.#profileRepository = profileRepository;
    this.#suggestionRepository = suggestionRepository;
    this.#eventPublisher = eventPublisher;
    this.#metrics = metrics;
  }

  async handleProfileUpdated(payload: ProfileUpdatedPayload): Promise<void> {
    const existing = await this.#profileRepository.findById(payload.id);

    if (existing) {
      existing.update(payload);
      await this.#profileRepository.upsert(existing);
    } else {
      const profile = Profile.create(payload);
      await this.#profileRepository.upsert(profile);
    }
  }

  async handleProfilesMatched(profileId1: string, profileId2: string): Promise<void> {
    await this.#suggestionRepository.updateStatusForMatchedPair(
      profileId1,
      profileId2,
      SuggestionStatus.MATCHED,
    );
  }

  async triggerDiscovery(profileId: string): Promise<void> {
    this.#metrics.recordDiscoveryTriggered();

    const candidates = await this.#profileRepository.findUnsuggestedActiveProfiles(profileId);

    if (candidates.length === 0) {
      return;
    }

    const suggestions = await Promise.all(
      candidates.map(async (candidate) => {
        const suggestion = Suggestion.create({
          discovererProfileId: profileId,
          suggestedProfileId: candidate.id,
        });
        return this.#suggestionRepository.save(suggestion);
      }),
    );

    this.#metrics.recordSuggestionsCreated(suggestions.length);

    await this.#eventPublisher.publish(EVENTS.SUGGESTIONS_LISTED, {
      profileId,
      suggestions: suggestions.map((suggestion) => suggestion.suggestedProfileId),
    });
  }
}
