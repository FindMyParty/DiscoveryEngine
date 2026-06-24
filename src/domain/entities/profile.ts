import { z } from "zod";

const profileSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type ProfileData = z.infer<typeof profileSchema>;

export class Profile {
  readonly id: string;
  isActive: boolean;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor({ id, isActive, createdAt, updatedAt }: ProfileData) {
    this.id = id;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(data: { id: string; isActive?: boolean }): Profile {
    const now = new Date();
    return new Profile({
      id: z.string().uuid().parse(data.id),
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(row: {
    id: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): Profile {
    return new Profile(
      profileSchema.parse({
        id: row.id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );
  }

  updateActiveStatus(isActive: boolean): this {
    this.isActive = isActive;
    this.updatedAt = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      isActive: this.isActive,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
