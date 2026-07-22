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

export interface ProfilesMatchedPayload {
  profileId1: string;
  profileId2: string;
  matchedAt?: Date;
}

export interface IDiscoveryUseCase {
  handleProfileUpdated(payload: ProfileUpdatedPayload): Promise<void>;
  handleProfilesMatched(payload: ProfilesMatchedPayload): Promise<void>;
  triggerDiscovery(profileId: string): Promise<void>;
}
