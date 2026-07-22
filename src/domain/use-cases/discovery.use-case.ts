import { Match } from "../entities/match.js";
import { Profile } from "../entities/profile.js";
import type {
  IDiscoveryUseCase,
  ProfileUpdatedPayload,
  ProfilesMatchedPayload,
} from "../ports/inbound/discovery-use-case.port.js";
import type { IProfileRepository } from "../ports/outbound/profile-repository.port.js";
import type { IMatchRepository } from "../ports/outbound/match-repository.port.js";
import type { IEventPublisher } from "../ports/outbound/event-publisher.port.js";
import type { ILogger } from "../ports/outbound/logger.port.js";

export interface IDiscoveryMetrics {
  recordDiscoveryTriggered(): void;
}

interface DiscoveryUseCaseDeps {
  profileRepository: IProfileRepository;
  matchRepository: IMatchRepository;
  eventPublisher: IEventPublisher;
  metrics: IDiscoveryMetrics;
  logger: ILogger;
}

export class DiscoveryUseCase implements IDiscoveryUseCase {
  readonly #profileRepository: IProfileRepository;
  readonly #matchRepository: IMatchRepository;
  // Retained for the outbound suggestions.listed plumbing; the publish itself
  // returns with the upcoming Redis-based suggestion generation.
  readonly #eventPublisher: IEventPublisher;
  readonly #metrics: IDiscoveryMetrics;
  readonly #logger: ILogger;

  constructor({ profileRepository, matchRepository, eventPublisher, metrics, logger }: DiscoveryUseCaseDeps) {
    this.#profileRepository = profileRepository;
    this.#matchRepository = matchRepository;
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

  async handleProfilesMatched(payload: ProfilesMatchedPayload): Promise<void> {
    const { profileId1, profileId2, matchedAt } = payload;
    this.#logger.debug({ profileId1, profileId2 }, "Handling profiles matched event");

    const match = Match.create({ profileId1, profileId2, matchedAt });
    await this.#matchRepository.save(match);
    this.#logger.info(
      { profileId1: match.profileId1, profileId2: match.profileId2 },
      "Match persisted from profiles matched event",
    );
  }

  async triggerDiscovery(profileId: string): Promise<void> {
    this.#logger.debug({ profileId }, "Handling discovery triggered event");
    this.#metrics.recordDiscoveryTriggered();

    // TODO: rebuild suggestion generation and the suggestions.listed publish
    // on top of the upcoming Redis integration.
    this.#logger.info(
      { profileId },
      "Discovery triggered received; suggestion generation pending Redis integration",
    );
  }
}
