"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GiglingCard } from "@/components/shared/GiglingCard";
import type { UIGigling } from "@/types/ui";

async function fetchGiglings(address: string): Promise<UIGigling[]> {
  const res = await fetch(`/api/giglings/${address}`);
  if (!res.ok) throw new Error("Failed to load giglings");
  const data = (await res.json()) as { giglings: UIGigling[] };
  return data.giglings;
}

export default function MyGiglingsPage() {
  const { address, isConnected, isConnecting, connect } = useWallet();

  const { data: giglings, isLoading } = useQuery({
    queryKey: ["giglings", address],
    queryFn: () => fetchGiglings(address!),
    enabled: !!address,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Giglings</h1>
          <p className="text-text-muted">
            The racing pets held by your connected wallet.
          </p>
        </div>
      </div>

      {!isConnected ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <Wallet className="h-10 w-10 text-text-dim" />
          <p className="text-text-muted">
            Connect your wallet to see your giglings.
          </p>
          <Button onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse opacity-50" />
          ))}
        </div>
      ) : !giglings || giglings.length === 0 ? (
        <Card className="py-16 text-center text-text-muted">
          No giglings found for this wallet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {giglings.map((g) => (
            <GiglingCard key={g.petId} gigling={g} />
          ))}
        </div>
      )}
    </div>
  );
}
