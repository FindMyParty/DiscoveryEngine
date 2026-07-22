import { z } from "zod";

const matchSchema = z.object({
  profileId1: z.string().uuid(),
  profileId2: z.string().uuid(),
  matchedAt: z.date(),
});

type MatchData = z.infer<typeof matchSchema>;

export class Match {
  readonly profileId1: string;
  readonly profileId2: string;
  readonly matchedAt: Date;

  constructor({ profileId1, profileId2, matchedAt }: MatchData) {
    this.profileId1 = profileId1;
    this.profileId2 = profileId2;
    this.matchedAt = matchedAt;
  }

  static create(data: { profileId1: string; profileId2: string; matchedAt?: Date }): Match {
    // Canonical ordering: the smaller id is always stored first, mirroring the
    // Match Service invariant, so a pair maps to a single row regardless of order.
    const [firstProfileId, secondProfileId] = [data.profileId1, data.profileId2].sort();
    return new Match({
      profileId1: z.string().uuid().parse(firstProfileId),
      profileId2: z.string().uuid().parse(secondProfileId),
      matchedAt: data.matchedAt ?? new Date(),
    });
  }

  static fromPersistence(row: {
    profile_id_1: string;
    profile_id_2: string;
    matched_at: Date;
  }): Match {
    return new Match(
      matchSchema.parse({
        profileId1: row.profile_id_1,
        profileId2: row.profile_id_2,
        matchedAt: row.matched_at,
      }),
    );
  }

  toJSON() {
    return {
      profileId1: this.profileId1,
      profileId2: this.profileId2,
      matchedAt: this.matchedAt.toISOString(),
    };
  }
}
