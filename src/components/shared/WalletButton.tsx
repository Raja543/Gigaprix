"use client";

import { useState } from "react";
import { Wallet, LogOut, ChevronDown, User, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const { authed, needsSignIn, signingIn, signIn, signOut } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  async function handleSignIn() {
    const ok = await signIn();
    toast(ok ? "Signed in." : "Sign-in failed or cancelled.", ok ? "success" : "error");
  }

  if (!isConnected || !address) {
    return (
      <Button onClick={connect} disabled={isConnecting} size="sm">
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  // Connected but not signed in: prompt the signature.
  if (needsSignIn) {
    return (
      <Button onClick={handleSignIn} disabled={signingIn} size="sm" variant="accent">
        {signingIn ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {signingIn ? "Signing in…" : "Sign in"}
      </Button>
    );
  }

  async function handleDisconnect() {
    await signOut();
    disconnect();
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="font-mono"
      >
        <span
          className="h-2 w-2 rounded-full bg-primary"
          title={authed ? "Signed in" : undefined}
        />
        {truncateAddress(address)}
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-surface-2 shadow-xl">
            <Link
              href={`/profile/${address}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface"
            >
              <User className="h-4 w-4" /> My Profile
            </Link>
            <button
              onClick={handleDisconnect}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-surface"
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
