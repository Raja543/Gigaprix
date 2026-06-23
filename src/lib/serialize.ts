import "server-only";
import type {
  UITournamentCard,
  UITournamentFull,
} from "@/types/ui";

/**
 * Deep JSON round-trip that turns BigInt → string and Date → ISO string,
 * producing client-safe view models. Prisma includes must match the UI shapes.
 */
function toClient<T>(value: unknown): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  ) as T;
}

export function serializeTournamentFull(t: unknown): UITournamentFull {
  return toClient<UITournamentFull>(t);
}

export function serializeTournamentCard(t: unknown): UITournamentCard {
  return toClient<UITournamentCard>(t);
}

export function serializeTournamentCards(list: unknown[]): UITournamentCard[] {
  return list.map((t) => toClient<UITournamentCard>(t));
}
