export interface IDiscoveryUseCase {
  handleProfileUpdated(profileId: string, isActive: boolean): Promise<void>;
  handleProfilesMatched(profileId1: string, profileId2: string): Promise<void>;
  triggerDiscovery(profileId: string): Promise<void>;
}
