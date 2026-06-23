import {
  Users,
  ChevronUp,
  Lock,
  FlaskConical,
  Swords,
  ListOrdered,
} from "lucide-react";
import { raceTypeMeta, formatLabel } from "@/lib/competition";
import { RaceTypeIcon } from "@/components/shared/RaceTypeIcon";
import type { UITournament } from "@/types/ui";

function Chip({
  icon,
  children,
  tone = "default",
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "warning" | "accent";
}) {
  const toneCls =
    tone === "warning"
      ? "border-warning/40 bg-warning/10 text-warning"
      : tone === "accent"
        ? "border-accent/40 bg-accent/10 text-accent"
        : "border-border bg-surface text-text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneCls}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Compact summary of a competition's format, race and stage rules. */
export function RequirementsBanner({ tournament: t }: { tournament: UITournament }) {
  const race = raceTypeMeta(t.raceType);
  const isLeague = t.format === "ROUND_ROBIN";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        icon={
          isLeague ? (
            <ListOrdered className="h-3.5 w-3.5" />
          ) : (
            <Swords className="h-3.5 w-3.5" />
          )
        }
      >
        {formatLabel(t.format)}
      </Chip>
      <Chip icon={<RaceTypeIcon type={t.raceType} />}>
        {race.label} · {race.distance}m
      </Chip>
      <Chip icon={<Users className="h-3.5 w-3.5" />}>{t.heatSize} per group</Chip>
      {!t.isPublic && (
        <Chip icon={<Lock className="h-3.5 w-3.5" />} tone="accent">
          Creator Cup · Private
        </Chip>
      )}
      {isLeague ? (
        <Chip icon={<ListOrdered className="h-3.5 w-3.5" />}>Points league</Chip>
      ) : (
        <Chip icon={<ChevronUp className="h-3.5 w-3.5" />}>
          Top {t.advanceCount} qualify
        </Chip>
      )}
      {t.whitelistEnabled && (
        <Chip icon={<Lock className="h-3.5 w-3.5" />} tone="accent">
          Whitelist only
        </Chip>
      )}
      {t.testMode && (
        <Chip icon={<FlaskConical className="h-3.5 w-3.5" />} tone="warning">
          Test mode
        </Chip>
      )}
    </div>
  );
}
