import { Zap, Gauge, Route, Flag } from "lucide-react";
import type { RaceType } from "@/lib/competition";

const ICONS: Record<RaceType, typeof Zap> = {
  DASH: Zap, // short, explosive
  SPRINT: Gauge, // balanced pace
  MARATHON: Route, // long endurance
  GRAND_PRIX: Flag, // full showcase
};

/** Geometric icon for a race distance. */
export function RaceTypeIcon({
  type,
  className = "h-3.5 w-3.5",
}: {
  type: RaceType | string;
  className?: string;
}) {
  const Icon = ICONS[type as RaceType] ?? Gauge;
  return <Icon className={className} />;
}
