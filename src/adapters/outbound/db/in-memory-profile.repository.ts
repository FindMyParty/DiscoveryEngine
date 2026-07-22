import { Profile } from "../../../domain/entities/profile.js";
import type { IProfileRepository } from "../../../domain/ports/outbound/profile-repository.port.js";

export class InMemoryProfileRepository implements IProfileRepository {
  #profiles: Map<string, Profile> = new Map();

  async upsert(profile: Profile): Promise<Profile> {
    this.#profiles.set(profile.id, profile);
    return profile;
  }

  async findById(id: string): Promise<Profile | null> {
    return this.#profiles.get(id) ?? null;
  }

  clear(): void {
    this.#profiles.clear();
  }
}
