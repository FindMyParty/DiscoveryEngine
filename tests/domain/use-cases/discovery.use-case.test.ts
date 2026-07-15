import { describe, it, expect, beforeEach } from "vitest";
import { DiscoveryUseCase } from "../../../src/domain/use-cases/discovery.use-case.js";
import { SuggestionStatus } from "../../../src/domain/entities/suggestion.js";
import { Experience } from "../../../src/domain/entities/profile.js";
import { InMemoryProfileRepository } from "../../../src/adapters/outbound/db/in-memory-profile.repository.js";
import { InMemorySuggestionRepository } from "../../../src/adapters/outbound/db/in-memory-suggestion.repository.js";
import { InMemoryEventPublisher } from "../../../src/adapters/outbound/messaging/in-memory-event.publisher.js";
import type { ProfileUpdatedPayload } from "../../../src/domain/ports/inbound/discovery-use-case.port.js";

const PROFILE_1 = "00000000-0000-0000-0000-000000000001";
const PROFILE_2 = "00000000-0000-0000-0000-000000000002";
const PROFILE_3 = "00000000-0000-0000-0000-000000000003";

function profilePayload(id: string, isActive = true): ProfileUpdatedPayload {
  return {
    id,
    isActive,
    isDM: false,
    isPlayer: true,
    isRemote: false,
    experience: Experience.BEGINNER,
    latitude: null,
    longitude: null,
  };
}

const noopMetrics = {
  recordDiscoveryTriggered: () => {},
  recordSuggestionsCreated: () => {},
};

describe("DiscoveryUseCase", () => {
  let profileRepository: InMemoryProfileRepository;
  let suggestionRepository: InMemorySuggestionRepository;
  let eventPublisher: InMemoryEventPublisher;
  let useCase: DiscoveryUseCase;

  beforeEach(() => {
    profileRepository = new InMemoryProfileRepository();
    suggestionRepository = new InMemorySuggestionRepository();
    eventPublisher = new InMemoryEventPublisher();
    useCase = new DiscoveryUseCase({
      profileRepository,
      suggestionRepository,
      eventPublisher,
      metrics: noopMetrics,
    });
  });

  describe("handleProfileUpdated", () => {
    it("creates a new profile when it does not exist", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1));

      const profile = await profileRepository.findById(PROFILE_1);
      expect(profile).not.toBeNull();
      expect(profile!.isActive).toBe(true);
    });

    it("updates an existing profile with the new payload", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1, true));
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1, false));

      const profile = await profileRepository.findById(PROFILE_1);
      expect(profile!.isActive).toBe(false);
    });
  });

  describe("triggerDiscovery", () => {
    it("creates suggestions and publishes the suggestions listed event", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1));
      await useCase.handleProfileUpdated(profilePayload(PROFILE_2));
      await useCase.handleProfileUpdated(profilePayload(PROFILE_3));

      await useCase.triggerDiscovery(PROFILE_1);

      const events = eventPublisher.getByRoutingKey("discovery.suggestion.listed");
      expect(events).toHaveLength(1);

      const payload = events[0].payload as { profileId: string; suggestions: string[] };
      expect(payload.profileId).toBe(PROFILE_1);
      expect(payload.suggestions).toHaveLength(2);
      expect(payload.suggestions).toEqual(expect.arrayContaining([PROFILE_2, PROFILE_3]));
    });

    it("does not publish an event when there are no candidates", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1));

      await useCase.triggerDiscovery(PROFILE_1);

      const events = eventPublisher.getByRoutingKey("discovery.suggestion.listed");
      expect(events).toHaveLength(0);
    });

    it("excludes inactive profiles from suggestions", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1, true));
      await useCase.handleProfileUpdated(profilePayload(PROFILE_2, false));

      await useCase.triggerDiscovery(PROFILE_1);

      const events = eventPublisher.getByRoutingKey("discovery.suggestion.listed");
      expect(events).toHaveLength(0);
    });
  });

  describe("handleProfilesMatched", () => {
    it("marks suggestions as matched in both directions", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1));
      await useCase.handleProfileUpdated(profilePayload(PROFILE_2));
      await useCase.triggerDiscovery(PROFILE_1);
      await useCase.triggerDiscovery(PROFILE_2);

      await useCase.handleProfilesMatched(PROFILE_1, PROFILE_2);

      const forward = await suggestionRepository.findByPair(PROFILE_1, PROFILE_2);
      const reverse = await suggestionRepository.findByPair(PROFILE_2, PROFILE_1);

      expect(forward?.status).toBe(SuggestionStatus.MATCHED);
      expect(reverse?.status).toBe(SuggestionStatus.MATCHED);
    });
  });
});
