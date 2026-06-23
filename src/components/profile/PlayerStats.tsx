import { Activity, Trophy, Zap, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { winRate } from "@/lib/utils";

export function PlayerStats({
  totalRaces,
  elo,
  tournaments,
  championships,
  wins,
}: {
  totalRaces: number;
  elo: number | null;
  tournaments: number;
  championships: number;
  wins: number;
}) {
  const stats = [
    {
      label: "Total Races",
      value: totalRaces.toLocaleString(),
      icon: <Flag className="h-5 w-5 text-primary" />,
    },
    {
      label: "Win Rate",
      value: winRate(wins, totalRaces),
      icon: <Activity className="h-5 w-5 text-accent" />,
    },
    {
      label: "ELO",
      value: elo != null ? elo.toLocaleString() : "-",
      icon: <Zap className="h-5 w-5 text-warning" />,
    },
    {
      label: "Tournaments",
      value: `${championships}🏆 / ${tournaments}`,
      icon: <Trophy className="h-5 w-5 text-gold" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="flex flex-col gap-2">
          {s.icon}
          <div className="stat-number text-2xl font-bold">{s.value}</div>
          <div className="text-xs uppercase tracking-wide text-text-muted">
            {s.label}
          </div>
        </Card>
      ))}
    </div>
  );
}
