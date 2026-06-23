import { Badge } from "@/components/ui/badge";
import type { MatchStatus, TournamentStatus } from "@prisma/client";

type Variant = React.ComponentProps<typeof Badge>["variant"];

const TOURNAMENT: Record<TournamentStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: "Draft", variant: "default" },
  REGISTRATION: { label: "Registration Open", variant: "primary" },
  IN_PROGRESS: { label: "Live", variant: "danger" },
  COMPLETED: { label: "Completed", variant: "gold" },
  CANCELLED: { label: "Cancelled", variant: "default" },
};

const MATCH: Record<MatchStatus, { label: string; variant: Variant }> = {
  PENDING: { label: "Awaiting Race", variant: "default" },
  RACE_LINKED: { label: "Race Linked", variant: "accent" },
  RACE_OPEN: { label: "Race Open", variant: "accent" },
  RACING: { label: "Racing", variant: "danger" },
  COMPLETED: { label: "Completed", variant: "primary" },
  CANCELLED: { label: "Cancelled", variant: "default" },
  BYE: { label: "Bye", variant: "default" },
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const s = TOURNAMENT[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const s = MATCH[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
