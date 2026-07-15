import { describe, it, expect } from "vitest";
import { Profile, Experience } from "../../../src/domain/entities/profile.js";

const VALID_UUID = "00000000-0000-0000-0000-000000000001";

const defaultPersistenceRow = {
  id: VALID_UUID,
  is_active: true,
  is_dm: false,
  is_player: true,
  is_remote: false,
  experience: Experience.BEGINNER,
  latitude: null,
  longitude: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("Profile entity", () => {
  describe("Profile.create", () => {
    it("creates a profile with default field values", () => {
      const profile = Profile.create({ id: VALID_UUID });

      expect(profile.id).toBe(VALID_UUID);
      expect(profile.isActive).toBe(true);
      expect(profile.isDM).toBe(false);
      expect(profile.isPlayer).toBe(true);
      expect(profile.isRemote).toBe(false);
      expect(profile.experience).toBe(Experience.BEGINNER);
      expect(profile.latitude).toBeNull();
      expect(profile.longitude).toBeNull();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a profile with explicit field values", () => {
      const profile = Profile.create({
        id: VALID_UUID,
        isActive: false,
        isDM: true,
        isPlayer: false,
        isRemote: true,
        experience: Experience.VETERAN,
        latitude: -23.55,
        longitude: -46.63,
      });

      expect(profile.isActive).toBe(false);
      expect(profile.isDM).toBe(true);
      expect(profile.isPlayer).toBe(false);
      expect(profile.isRemote).toBe(true);
      expect(profile.experience).toBe(Experience.VETERAN);
      expect(profile.latitude).toBe(-23.55);
      expect(profile.longitude).toBe(-46.63);
    });

    it("throws when id is not a valid UUID", () => {
      expect(() => Profile.create({ id: "not-a-uuid" })).toThrow();
    });
  });

  describe("Profile.fromPersistence", () => {
    it("reconstructs a profile from a database row", () => {
      const now = new Date();
      const profile = Profile.fromPersistence({
        ...defaultPersistenceRow,
        created_at: now,
        updated_at: now,
      });

      expect(profile.id).toBe(VALID_UUID);
      expect(profile.isActive).toBe(true);
      expect(profile.isDM).toBe(false);
      expect(profile.isPlayer).toBe(true);
      expect(profile.isRemote).toBe(false);
      expect(profile.experience).toBe(Experience.BEGINNER);
      expect(profile.latitude).toBeNull();
      expect(profile.createdAt.getTime()).toBe(now.getTime());
    });

    it("parses numeric latitude and longitude from string", () => {
      const profile = Profile.fromPersistence({
        ...defaultPersistenceRow,
        latitude: "-23.5505200",
        longitude: "-46.6333100",
      });

      expect(profile.latitude).toBeCloseTo(-23.55052);
      expect(profile.longitude).toBeCloseTo(-46.63331);
    });
  });

  describe("update", () => {
    it("updates all mutable fields and bumps updatedAt", async () => {
      const profile = Profile.create({ id: VALID_UUID, isActive: true });
      const originalUpdatedAt = profile.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 1));
      profile.update({
        isActive: false,
        isDM: true,
        isPlayer: false,
        isRemote: true,
        experience: Experience.VETERAN,
        latitude: 10,
        longitude: 20,
      });

      expect(profile.isActive).toBe(false);
      expect(profile.isDM).toBe(true);
      expect(profile.isRemote).toBe(true);
      expect(profile.experience).toBe(Experience.VETERAN);
      expect(profile.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe("toJSON", () => {
    it("serializes to a plain object with ISO date strings", () => {
      const profile = Profile.create({ id: VALID_UUID });
      const json = profile.toJSON();

      expect(json.id).toBe(VALID_UUID);
      expect(json.isActive).toBe(true);
      expect(json.isDM).toBe(false);
      expect(typeof json.createdAt).toBe("string");
      expect(typeof json.updatedAt).toBe("string");
    });
  });
});
