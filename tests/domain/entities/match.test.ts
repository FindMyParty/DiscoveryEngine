import { describe, it, expect } from "vitest";
import { Match } from "../../../src/domain/entities/match.js";

const PROFILE_ID_A = "00000000-0000-0000-0000-000000000001";
const PROFILE_ID_B = "00000000-0000-0000-0000-000000000002";

describe("Match entity", () => {
  describe("Match.create", () => {
    it("stores the pair in canonical order regardless of argument order", () => {
      const forward = Match.create({ profileId1: PROFILE_ID_A, profileId2: PROFILE_ID_B });
      const reversed = Match.create({ profileId1: PROFILE_ID_B, profileId2: PROFILE_ID_A });

      expect(forward.profileId1).toBe(PROFILE_ID_A);
      expect(forward.profileId2).toBe(PROFILE_ID_B);
      expect(reversed.profileId1).toBe(PROFILE_ID_A);
      expect(reversed.profileId2).toBe(PROFILE_ID_B);
    });

    it("defaults matchedAt to the current time when omitted", () => {
      const match = Match.create({ profileId1: PROFILE_ID_A, profileId2: PROFILE_ID_B });
      expect(match.matchedAt).toBeInstanceOf(Date);
    });

    it("preserves an explicit matchedAt", () => {
      const matchedAt = new Date("2026-01-01T00:00:00.000Z");
      const match = Match.create({ profileId1: PROFILE_ID_A, profileId2: PROFILE_ID_B, matchedAt });
      expect(match.matchedAt).toBe(matchedAt);
    });

    it("throws when a profile id is not a valid UUID", () => {
      expect(() =>
        Match.create({ profileId1: "not-a-uuid", profileId2: PROFILE_ID_B }),
      ).toThrow();
    });
  });

  describe("Match.fromPersistence", () => {
    it("reconstructs a match from a database row", () => {
      const matchedAt = new Date();
      const match = Match.fromPersistence({
        profile_id_1: PROFILE_ID_A,
        profile_id_2: PROFILE_ID_B,
        matched_at: matchedAt,
      });

      expect(match.profileId1).toBe(PROFILE_ID_A);
      expect(match.profileId2).toBe(PROFILE_ID_B);
      expect(match.matchedAt.getTime()).toBe(matchedAt.getTime());
    });
  });
});
