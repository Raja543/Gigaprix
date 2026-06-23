"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Swords, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TournamentTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/tournaments/${id}`, label: "Overview", icon: Eye },
    { href: `/tournaments/${id}/bracket`, label: "Stages", icon: Swords },
    { href: `/tournaments/${id}/standings`, label: "Standings", icon: BarChart3 },
  ];

  return (
    <>
      {/* Desktop: top tab bar */}
      <div className="hidden gap-1 border-b border-border md:flex">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile: fixed bottom "chassis switcher" nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-bg/90 backdrop-blur md:hidden">
        {tabs.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-text-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
