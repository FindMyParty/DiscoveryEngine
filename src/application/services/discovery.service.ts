import type {
  IDiscoveryUseCase,
  ProfileUpdatedPayload,
  ProfilesMatchedPayload,
} from "../../domain/ports/inbound/discovery-use-case.port.js";

export class DiscoveryService {
  readonly #discoveryUseCase: IDiscoveryUseCase;

  constructor(discoveryUseCase: IDiscoveryUseCase) {
    this.#discoveryUseCase = discoveryUseCase;
  }

  async handleProfileUpdated(payload: ProfileUpdatedPayload): Promise<void> {
    await this.#discoveryUseCase.handleProfileUpdated(payload);
  }

  async handleProfilesMatched(payload: ProfilesMatchedPayload): Promise<void> {
    await this.#discoveryUseCase.handleProfilesMatched(payload);
  }

  async triggerDiscovery(profileId: string): Promise<void> {
    await this.#discoveryUseCase.triggerDiscovery(profileId);
  }
}
