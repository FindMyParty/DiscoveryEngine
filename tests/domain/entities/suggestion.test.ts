import { describe, it, expect } from "vitest";
import { Suggestion, SuggestionStatus } from "../../../src/domain/entities/suggestion.js";

const DISCOVERER_ID = "00000000-0000-0000-0000-000000000001";
const SUGGESTED_ID = "00000000-0000-0000-0000-000000000002";

describe("Suggestion entity", () => {
  describe("Suggestion.create", () => {
    it("creates a suggestion with pending status", () => {
      const suggestion = Suggestion.create({
        discovererProfileId: DISCOVERER_ID,
        suggestedProfileId: SUGGESTED_ID,
      });

      expect(suggestion.id).toBeTruthy();
      expect(suggestion.discovererProfileId).toBe(DISCOVERER_ID);
      expect(suggestion.suggestedProfileId).toBe(SUGGESTED_ID);
      expect(suggestion.status).toBe(SuggestionStatus.PENDING);
      expect(suggestion.createdAt).toBeInstanceOf(Date);
    });

    it("throws when profile IDs are not valid UUIDs", () => {
      expect(() =>
        Suggestion.create({
          discovererProfileId: "not-a-uuid",
          suggestedProfileId: SUGGESTED_ID,
        }),
      ).toThrow();
    });
  });

  describe("Suggestion.fromPersistence", () => {
    it("reconstructs a suggestion from a database row", () => {
      const now = new Date();
      const suggestion = Suggestion.fromPersistence({
        id: "00000000-0000-0000-0000-000000000003",
        discoverer_profile_id: DISCOVERER_ID,
        suggested_profile_id: SUGGESTED_ID,
        status: "pending",
        created_at: now,
        updated_at: now,
      });

      expect(suggestion.discovererProfileId).toBe(DISCOVERER_ID);
      expect(suggestion.status).toBe(SuggestionStatus.PENDING);
    });
  });

  describe("markAsMatched", () => {
    it("transitions status to matched and bumps updatedAt", async () => {
      const suggestion = Suggestion.create({
        discovererProfileId: DISCOVERER_ID,
        suggestedProfileId: SUGGESTED_ID,
      });
      const originalUpdatedAt = suggestion.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 1));
      suggestion.markAsMatched();

      expect(suggestion.status).toBe(SuggestionStatus.MATCHED);
      expect(suggestion.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
