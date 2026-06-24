import { z } from "zod";

export const SuggestionStatus = Object.freeze({
  PENDING: "pending",
  MATCHED: "matched",
} as const);

export type SuggestionStatusType = (typeof SuggestionStatus)[keyof typeof SuggestionStatus];

const suggestionSchema = z.object({
  id: z.string().uuid(),
  discovererProfileId: z.string().uuid(),
  suggestedProfileId: z.string().uuid(),
  status: z.nativeEnum(SuggestionStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type SuggestionData = z.infer<typeof suggestionSchema>;

export class Suggestion {
  readonly id: string;
  readonly discovererProfileId: string;
  readonly suggestedProfileId: string;
  status: SuggestionStatusType;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor({ id, discovererProfileId, suggestedProfileId, status, createdAt, updatedAt }: SuggestionData) {
    this.id = id;
    this.discovererProfileId = discovererProfileId;
    this.suggestedProfileId = suggestedProfileId;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(data: { discovererProfileId: string; suggestedProfileId: string }): Suggestion {
    const now = new Date();
    return new Suggestion({
      id: crypto.randomUUID(),
      discovererProfileId: z.string().uuid().parse(data.discovererProfileId),
      suggestedProfileId: z.string().uuid().parse(data.suggestedProfileId),
      status: SuggestionStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(row: {
    id: string;
    discoverer_profile_id: string;
    suggested_profile_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  }): Suggestion {
    return new Suggestion(
      suggestionSchema.parse({
        id: row.id,
        discovererProfileId: row.discoverer_profile_id,
        suggestedProfileId: row.suggested_profile_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );
  }

  markAsMatched(): this {
    this.status = SuggestionStatus.MATCHED;
    this.updatedAt = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      discovererProfileId: this.discovererProfileId,
      suggestedProfileId: this.suggestedProfileId,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
