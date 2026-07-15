import type { IDiscoveryUseCase, ProfileUpdatedPayload } from "../../domain/ports/inbound/discovery-use-case.port.js";

export class DiscoveryService {
  readonly #discoveryUseCase: IDiscoveryUseCase;

  constructor(discoveryUseCase: IDiscoveryUseCase) {
    this.#discoveryUseCase = discoveryUseCase;
  }

  async handleProfileUpdated(payload: ProfileUpdatedPayload): Promise<void> {
    await this.#discoveryUseCase.handleProfileUpdated(payload);
  }

  async handleProfilesMatched(profileId1: string, profileId2: string): Promise<void> {
    await this.#discoveryUseCase.handleProfilesMatched(profileId1, profileId2);
  }

  async triggerDiscovery(profileId: string): Promise<void> {
    await this.#discoveryUseCase.triggerDiscovery(profileId);
  }
}
