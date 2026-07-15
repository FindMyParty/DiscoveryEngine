import type { ExperienceType } from "../../entities/profile.js";

export interface ProfileUpdatedPayload {
  id: string;
  isActive: boolean;
  isDM: boolean;
  isPlayer: boolean;
  isRemote: boolean;
  experience: ExperienceType;
  latitude: number | null;
  longitude: number | null;
}

export interface IDiscoveryUseCase {
  handleProfileUpdated(payload: ProfileUpdatedPayload): Promise<void>;
  handleProfilesMatched(profileId1: string, profileId2: string): Promise<void>;
  triggerDiscovery(profileId: string): Promise<void>;
}
