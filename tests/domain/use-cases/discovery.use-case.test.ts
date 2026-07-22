import { describe, it, expect, beforeEach } from "vitest";
import { DiscoveryUseCase } from "../../../src/domain/use-cases/discovery.use-case.js";
import { Experience } from "../../../src/domain/entities/profile.js";
import { InMemoryProfileRepository } from "../../../src/adapters/outbound/db/in-memory-profile.repository.js";
import { InMemoryMatchRepository } from "../../../src/adapters/outbound/db/in-memory-match.repository.js";
import { InMemoryEventPublisher } from "../../../src/adapters/outbound/messaging/in-memory-event.publisher.js";
import type { ProfileUpdatedPayload } from "../../../src/domain/ports/inbound/discovery-use-case.port.js";

const PROFILE_1 = "00000000-0000-0000-0000-000000000001";
const PROFILE_2 = "00000000-0000-0000-0000-000000000002";

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

const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe("DiscoveryUseCase", () => {
  let profileRepository: InMemoryProfileRepository;
  let matchRepository: InMemoryMatchRepository;
  let eventPublisher: InMemoryEventPublisher;
  let discoveriesTriggered: number;
  let useCase: DiscoveryUseCase;

  beforeEach(() => {
    profileRepository = new InMemoryProfileRepository();
    matchRepository = new InMemoryMatchRepository();
    eventPublisher = new InMemoryEventPublisher();
    discoveriesTriggered = 0;
    useCase = new DiscoveryUseCase({
      profileRepository,
      matchRepository,
      eventPublisher,
      metrics: {
        recordDiscoveryTriggered: () => {
          discoveriesTriggered += 1;
        },
      },
      logger: noopLogger,
    });
  });

  describe("handleProfileUpdated", () => {
    it("creates a new profile when it does not exist", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1));

      const profile = await profileRepository.findById(PROFILE_1);
      expect(profile).not.toBeNull();
      expect(profile!.isActive).toBe(true);
    });

    it("skips persistence when a profile with the same id already exists (idempotent no-op)", async () => {
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1, true));
      await useCase.handleProfileUpdated(profilePayload(PROFILE_1, false));

      const profile = await profileRepository.findById(PROFILE_1);
      expect(profile!.isActive).toBe(true);
    });
  });

  describe("handleProfilesMatched", () => {
    it("persists the match for the profile pair", async () => {
      await useCase.handleProfilesMatched({ profileId1: PROFILE_2, profileId2: PROFILE_1 });

      const matches = await matchRepository.findByProfileId(PROFILE_1);
      expect(matches).toHaveLength(1);
      expect(matches[0].profileId1).toBe(PROFILE_1);
      expect(matches[0].profileId2).toBe(PROFILE_2);
    });
  });

  describe("triggerDiscovery", () => {
    it("records the discovery triggered metric and publishes nothing until Redis lands", async () => {
      await useCase.triggerDiscovery(PROFILE_1);

      expect(discoveriesTriggered).toBe(1);
      expect(eventPublisher.events).toHaveLength(0);
    });
  });
});
