/**
 * Single source of truth for the Competition Engine: the event types it runs and
 * the race distances it supports. Shared by the builder, edit form, cards, banner
 * and overview so labels and distances stay consistent everywhere.
 */

export type CompetitionType =
  | "CHAMPIONSHIP"
  | "CREATOR_CUP"
  | "COMMUNITY_CUP"
  | "GUILD_CUP";

export type RaceType = "DASH" | "SPRINT" | "MARATHON" | "GRAND_PRIX";

/** The competition mechanic. Maps to the Prisma `TournamentFormat` enum. */
export type CompetitionFormat = "SINGLE_ELIMINATION" | "ROUND_ROBIN";

export interface FormatMeta {
  /** Prisma format value, or null for not-yet-available formats. */
  value: CompetitionFormat | null;
  label: string;
  desc: string;
  available: boolean;
}

export const FORMATS: FormatMeta[] = [
  {
    value: "SINGLE_ELIMINATION",
    label: "Knockout Championship",
    desc: "Groups of 8 race each stage; the top N qualify and the field narrows to a grand final.",
    available: true,
  },
  {
    value: "ROUND_ROBIN",
    label: "League",
    desc: "Several matchdays in rotating groups of 8, ranked by points. No elimination - most consistent racer wins.",
    available: true,
  },
  {
    value: null,
    label: "Time Trial",
    desc: "Pure leaderboard by best finish time across many qualifying races. Coming with unlimited racing.",
    available: false,
  },
  {
    value: null,
    label: "Swiss",
    desc: "Fixed rounds paired by record, no elimination. Needs many races - coming with unlimited racing.",
    available: false,
  },
];

const FORMAT_LABEL: Record<CompetitionFormat, string> = {
  SINGLE_ELIMINATION: "Knockout",
  ROUND_ROBIN: "League",
};

export function formatLabel(value: CompetitionFormat | string): string {
  return FORMAT_LABEL[value as CompetitionFormat] ?? "Knockout";
}

export interface CompetitionMeta {
  value: CompetitionType;
  label: string;
  tagline: string;
  desc: string;
  /** Guild Cup is reserved for a future release. */
  available: boolean;
}

export const COMPETITION_TYPES: CompetitionMeta[] = [
  {
    value: "CHAMPIONSHIP",
    label: "Championship",
    tagline: "Open qualifier",
    desc: "Open multi-stage championship - the field qualifies down to one champion.",
    available: true,
  },
  {
    value: "CREATOR_CUP",
    label: "Creator Cup",
    tagline: "Creator hosted",
    desc: "A cup hosted by a creator for their audience, with their own rules & branding.",
    available: true,
  },
  {
    value: "COMMUNITY_CUP",
    label: "Community Cup",
    tagline: "Community run",
    desc: "An open community event anyone can enter and help run.",
    available: true,
  },
  {
    value: "GUILD_CUP",
    label: "Guild Cup",
    tagline: "Coming soon",
    desc: "Guild-versus-guild competition with team scoring. Coming in a future release.",
    available: false,
  },
];

export interface RaceTypeMeta {
  value: RaceType;
  label: string;
  /** Track length in metres, used when creating the on-chain race. */
  distance: number;
  desc: string;
}

export const RACE_TYPES: RaceTypeMeta[] = [
  { value: "DASH", label: "Dash", distance: 500, desc: "Short, explosive 500m sprint." },
  { value: "SPRINT", label: "Sprint", distance: 1200, desc: "Classic 1200m balanced race." },
  { value: "MARATHON", label: "Marathon", distance: 2400, desc: "Endurance 2400m test." },
  { value: "GRAND_PRIX", label: "Grand Prix", distance: 3000, desc: "Full-distance 3000m showcase." },
];

const COMPETITION_BY_VALUE = new Map(COMPETITION_TYPES.map((c) => [c.value, c]));
const RACE_TYPE_BY_VALUE = new Map(RACE_TYPES.map((r) => [r.value, r]));

export function competitionMeta(value: CompetitionType | string): CompetitionMeta {
  return COMPETITION_BY_VALUE.get(value as CompetitionType) ?? COMPETITION_TYPES[0];
}

export function raceTypeMeta(value: RaceType | string): RaceTypeMeta {
  return RACE_TYPE_BY_VALUE.get(value as RaceType) ?? RACE_TYPES[1];
}

export function distanceForRaceType(value: RaceType | string): number {
  return raceTypeMeta(value).distance;
}

/** Pick the closest race type for a stored track length (back-compat). */
export function raceTypeForDistance(distance: number): RaceType {
  let best = RACE_TYPES[1];
  let bestDiff = Infinity;
  for (const r of RACE_TYPES) {
    const diff = Math.abs(r.distance - distance);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best.value;
}
