import { describe, it, expect } from "vitest";
import { Profile } from "../../../src/domain/entities/profile.js";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";

describe("Profile entity", () => {
  describe("Profile.create", () => {
    it("creates a profile with default active status", () => {
      const profile = Profile.create({ id: VALID_UUID });

      expect(profile.id).toBe(VALID_UUID);
      expect(profile.isActive).toBe(true);
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a profile with explicit active status", () => {
      const profile = Profile.create({ id: VALID_UUID, isActive: false });

      expect(profile.isActive).toBe(false);
    });

    it("throws when id is not a valid UUID", () => {
      expect(() => Profile.create({ id: "not-a-uuid" })).toThrow();
    });
  });

  describe("Profile.fromPersistence", () => {
    it("reconstructs a profile from a database row", () => {
      const now = new Date();
      const profile = Profile.fromPersistence({
        id: VALID_UUID,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      expect(profile.id).toBe(VALID_UUID);
      expect(profile.isActive).toBe(true);
      expect(profile.createdAt.getTime()).toBe(now.getTime());
    });
  });

  describe("updateActiveStatus", () => {
    it("updates isActive and bumps updatedAt", async () => {
      const profile = Profile.create({ id: VALID_UUID, isActive: true });
      const originalUpdatedAt = profile.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 1));
      profile.updateActiveStatus(false);

      expect(profile.isActive).toBe(false);
      expect(profile.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("toJSON", () => {
    it("serializes to a plain object with ISO date strings", () => {
      const profile = Profile.create({ id: VALID_UUID });
      const json = profile.toJSON();

      expect(json.id).toBe(VALID_UUID);
      expect(typeof json.createdAt).toBe("string");
      expect(typeof json.updatedAt).toBe("string");
    });
  });
});
