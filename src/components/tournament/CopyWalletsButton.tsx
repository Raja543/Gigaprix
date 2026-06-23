"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Manager-only: copy the wallet addresses of the racers in a group (one per
 * line) - handy for inviting/whitelisting them or setting up the on-chain race.
 * Renders nothing for non-managers or empty groups.
 */
export function CopyWalletsButton({
  addresses,
  managers,
  className,
  size = "xs",
}: {
  addresses: string[];
  /** Host + co-host wallet addresses allowed to copy. */
  managers: string[];
  className?: string;
  size?: "xs" | "sm";
}) {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  const me = address?.toLowerCase();
  const isManager = !!me && managers.some((m) => m.toLowerCase() === me);
  if (!isManager || addresses.length === 0) return null;

  function copy() {
    navigator.clipboard.writeText(addresses.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (size === "sm") {
    return (
      <button
        onClick={copy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text",
          className
        )}
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : `Copy wallets (${addresses.length})`}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-text",
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : `Copy wallets (${addresses.length})`}
    </button>
  );
}
