import { z } from "zod";

export const Experience = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  VETERAN: "veteran",
} as const;

export type ExperienceType = (typeof Experience)[keyof typeof Experience];

const profileSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
  isDM: z.boolean(),
  isPlayer: z.boolean(),
  isRemote: z.boolean(),
  experience: z.nativeEnum(Experience),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type ProfileData = z.infer<typeof profileSchema>;

export class Profile {
  readonly id: string;
  isActive: boolean;
  isDM: boolean;
  isPlayer: boolean;
  isRemote: boolean;
  experience: ExperienceType;
  latitude: number | null;
  longitude: number | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(data: ProfileData) {
    this.id = data.id;
    this.isActive = data.isActive;
    this.isDM = data.isDM;
    this.isPlayer = data.isPlayer;
    this.isRemote = data.isRemote;
    this.experience = data.experience;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(data: {
    id: string;
    isActive?: boolean;
    isDM?: boolean;
    isPlayer?: boolean;
    isRemote?: boolean;
    experience?: ExperienceType;
    latitude?: number | null;
    longitude?: number | null;
  }): Profile {
    const now = new Date();
    return new Profile({
      id: z.string().uuid().parse(data.id),
      isActive: data.isActive ?? true,
      isDM: data.isDM ?? false,
      isPlayer: data.isPlayer ?? true,
      isRemote: data.isRemote ?? false,
      experience: data.experience ?? Experience.BEGINNER,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(row: {
    id: string;
    is_active: boolean;
    is_dm: boolean;
    is_player: boolean;
    is_remote: boolean;
    experience: string;
    latitude: string | null;
    longitude: string | null;
    created_at: Date;
    updated_at: Date;
  }): Profile {
    return new Profile(
      profileSchema.parse({
        id: row.id,
        isActive: row.is_active,
        isDM: row.is_dm,
        isPlayer: row.is_player,
        isRemote: row.is_remote,
        experience: row.experience,
        latitude: row.latitude !== null ? parseFloat(row.latitude) : null,
        longitude: row.longitude !== null ? parseFloat(row.longitude) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );
  }

  update(data: {
    isActive: boolean;
    isDM: boolean;
    isPlayer: boolean;
    isRemote: boolean;
    experience: ExperienceType;
    latitude: number | null;
    longitude: number | null;
  }): this {
    this.isActive = data.isActive;
    this.isDM = data.isDM;
    this.isPlayer = data.isPlayer;
    this.isRemote = data.isRemote;
    this.experience = data.experience;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.updatedAt = new Date();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      isActive: this.isActive,
      isDM: this.isDM,
      isPlayer: this.isPlayer,
      isRemote: this.isRemote,
      experience: this.experience,
      latitude: this.latitude,
      longitude: this.longitude,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
