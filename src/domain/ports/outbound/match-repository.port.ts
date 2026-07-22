import type { Match } from "../../entities/match.js";

export interface IMatchRepository {
  save(match: Match): Promise<Match>;
  findByProfileId(profileId: string): Promise<Match[]>;
}
