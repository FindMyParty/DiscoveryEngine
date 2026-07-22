import type { Profile } from "../../entities/profile.js";

export interface IProfileRepository {
  upsert(profile: Profile): Promise<Profile>;
  findById(id: string): Promise<Profile | null>;
}
