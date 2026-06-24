import type { IDiscoveryUseCase } from "../../domain/ports/inbound/discovery-use-case.port.js";

export class DiscoveryService {
  readonly #discoveryUseCase: IDiscoveryUseCase;

  constructor(discoveryUseCase: IDiscoveryUseCase) {
    this.#discoveryUseCase = discoveryUseCase;
  }

  async handleProfileUpdated(profileId: string, isActive: boolean): Promise<void> {
    await this.#discoveryUseCase.handleProfileUpdated(profileId, isActive);
  }

  async handleProfilesMatched(profileId1: string, profileId2: string): Promise<void> {
    await this.#discoveryUseCase.handleProfilesMatched(profileId1, profileId2);
  }

  async triggerDiscovery(profileId: string): Promise<void> {
    await this.#discoveryUseCase.triggerDiscovery(profileId);
  }
}
