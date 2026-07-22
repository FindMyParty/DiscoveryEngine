import { Profile } from "../entities/profile.js";
import { Suggestion, SuggestionStatus } from "../entities/suggestion.js";
import type { IDiscoveryUseCase, ProfileUpdatedPayload } from "../ports/inbound/discovery-use-case.port.js";
import type { IProfileRepository } from "../ports/outbound/profile-repository.port.js";
import type { ISuggestionRepository } from "../ports/outbound/suggestion-repository.port.js";
import type { IEventPublisher } from "../ports/outbound/event-publisher.port.js";
import type { ILogger } from "../ports/outbound/logger.port.js";

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
  logger: ILogger;
}

export class DiscoveryUseCase implements IDiscoveryUseCase {
  readonly #profileRepository: IProfileRepository;
  readonly #suggestionRepository: ISuggestionRepository;
  readonly #eventPublisher: IEventPublisher;
  readonly #metrics: IDiscoveryMetrics;
  readonly #logger: ILogger;

  constructor({ profileRepository, suggestionRepository, eventPublisher, metrics, logger }: DiscoveryUseCaseDeps) {
    this.#profileRepository = profileRepository;
    this.#suggestionRepository = suggestionRepository;
    this.#eventPublisher = eventPublisher;
    this.#metrics = metrics;
    this.#logger = logger;
  }

  async handleProfileUpdated(payload: ProfileUpdatedPayload): Promise<void> {
    this.#logger.debug({ profileId: payload.id }, "Handling profile updated event");
    const existing = await this.#profileRepository.findById(payload.id);

    if (existing) {
      this.#logger.info(
        { profileId: payload.id },
        "Profile already existed; skipping persistence for profile updated event",
      );
      return;
    }

    const profile = Profile.create(payload);
    await this.#profileRepository.upsert(profile);
    this.#logger.info(
      { profileId: payload.id },
      "New profile created and persisted from profile updated event",
    );
  }

  async handleProfilesMatched(profileId1: string, profileId2: string): Promise<void> {
    this.#logger.debug({ profileId1, profileId2 }, "Handling profiles matched event");
    await this.#suggestionRepository.updateStatusForMatchedPair(
      profileId1,
      profileId2,
      SuggestionStatus.MATCHED,
    );
    this.#logger.info({ profileId1, profileId2 }, "Marked suggestions as matched for profile pair");
  }

  async triggerDiscovery(profileId: string): Promise<void> {
    this.#logger.debug({ profileId }, "Handling discovery triggered event");
    this.#metrics.recordDiscoveryTriggered();

    const candidates = await this.#profileRepository.findUnsuggestedActiveProfiles(profileId);

    if (candidates.length === 0) {
      this.#logger.warn({ profileId }, "Discovery found no candidate profiles to suggest");
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

    this.#logger.info(
      { profileId, suggestionsCount: suggestions.length },
      "Suggestions listed and published for profile",
    );
  }
}
