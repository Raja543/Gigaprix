"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, Plus } from "lucide-react";
import { WalletButton } from "@/components/shared/WalletButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/tournaments", label: "Championships" },
  { href: "/giglings", label: "Giglings" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-bg shadow-[0_4px_14px_-4px_var(--color-primary)]">
            <Flag className="h-4 w-4" />
          </span>
          <span className="hidden text-[15px] font-bold tracking-tight sm:inline">
            Giga<span className="neon-text">Prix</span>
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                  active
                    ? "bg-surface text-primary"
                    : "text-text-muted hover:text-text"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/tournaments/create" aria-label="Create competition">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </Link>
          <WalletButton />
        </div>
      </div>
      {/* Aurora gradient hairline under the bar */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </header>
  );
}
