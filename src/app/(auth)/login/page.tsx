"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Flag } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { truncateAddress } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected, isConnecting, connect } = useWallet();

  useEffect(() => {
    if (isConnected && address) {
      const t = setTimeout(() => router.push(`/profile/${address}`), 800);
      return () => clearTimeout(t);
    }
  }, [isConnected, address, router]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4">
      <Card className="w-full text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-bg">
          <Flag className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Connect your wallet</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in with your Abstract wallet to host tournaments, join
          competitions, and link your races.
        </p>

        <div className="mt-6">
          {isConnected && address ? (
            <div className="space-y-2">
              <p className="text-sm text-primary">
                Connected as {truncateAddress(address, 6)}
              </p>
              <p className="text-xs text-text-muted">Redirecting…</p>
            </div>
          ) : (
            <Button
              size="lg"
              onClick={connect}
              disabled={isConnecting}
              className="w-full"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
