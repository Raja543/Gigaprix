import { z } from "zod";

export const walletSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address");

export const createTournamentSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().max(2000).optional().nullable(),
  format: z.enum(["SINGLE_ELIMINATION", "ROUND_ROBIN"]).optional(),
  competitionType: z
    .enum(["CHAMPIONSHIP", "CREATOR_CUP", "COMMUNITY_CUP", "GUILD_CUP"])
    .optional(),
  raceType: z.enum(["DASH", "SPRINT", "MARATHON", "GRAND_PRIX"]).optional(),
  maxParticipants: z.number().int().min(2).max(4096),
  hostAddress: walletSchema,
  heatSize: z.number().int().min(2).max(8).optional(),
  advanceCount: z.number().int().min(1).max(7).optional(),
  advancePerRound: z.array(z.number().int().min(1).max(7)).optional(),
  testMode: z.boolean().optional(),
  whitelistEnabled: z.boolean().optional(),
  maxPerWallet: z.number().int().min(1).max(8).optional(),
  trackLength: z.number().int().min(0).max(100000).optional(),
  itemsMode: z.number().int().min(0).max(10).optional(),
  weatherMode: z.number().int().min(0).max(10).optional().nullable(),
  factionMode: z.number().int().min(0).max(10).optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  isPublic: z.boolean().optional(),
  registrationStart: z.coerce.date().optional().nullable(),
  registrationEnd: z.coerce.date().optional().nullable(),
});

export const joinTournamentSchema = z.object({
  walletAddress: walletSchema,
  petId: z.union([z.string(), z.number()]).optional().nullable(),
});

export const linkRaceSchema = z.object({
  walletAddress: walletSchema,
  raceId: z.union([z.string(), z.number()]),
});

export const updateProfileSchema = z.object({
  walletAddress: walletSchema,
  username: z.string().min(1).max(40).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  discord: z.string().max(64).optional().nullable(),
  twitter: z.string().max(64).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
});

/** Parse a raceId/petId input into a bigint, throwing on invalid values. */
export function toBigInt(value: string | number): bigint {
  const s = String(value).trim();
  if (!/^\d+$/.test(s)) throw new Error(`Invalid numeric id: ${value}`);
  return BigInt(s);
}
