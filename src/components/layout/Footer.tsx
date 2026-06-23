import Link from "next/link";
import { Flag } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-text-muted sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <span>
            Giga<span className="text-primary">Prix</span> - esports
            infrastructure for Gigling Racing
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/tournaments" className="hover:text-text">
            Tournaments
          </Link>
          <a
            href="https://gigaverse.io"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text"
          >
            Gigaverse
          </a>
          <span className="text-text-dim">Abstract · 2741</span>
        </div>
      </div>
    </footer>
  );
}
