import { Match } from "../../../domain/entities/match.js";
import type { IMatchRepository } from "../../../domain/ports/outbound/match-repository.port.js";

export class InMemoryMatchRepository implements IMatchRepository {
  #matches: Map<string, Match> = new Map();

  #keyFor(profileId1: string, profileId2: string): string {
    return `${profileId1}:${profileId2}`;
  }

  async save(match: Match): Promise<Match> {
    this.#matches.set(this.#keyFor(match.profileId1, match.profileId2), match);
    return match;
  }

  async findByProfileId(profileId: string): Promise<Match[]> {
    return [...this.#matches.values()].filter(
      (match) => match.profileId1 === profileId || match.profileId2 === profileId,
    );
  }

  clear(): void {
    this.#matches.clear();
  }
}
