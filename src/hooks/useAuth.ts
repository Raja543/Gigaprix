"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";

async function fetchSession(): Promise<string | null> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { address: string | null };
  return data.address?.toLowerCase() ?? null;
}

/**
 * Wallet session auth. `sessionAddress` is the wallet that has proven ownership
 * (signed in). `needsSignIn` is true when a wallet is connected but hasn't
 * signed in (or signed in as a different address). `signIn` runs the
 * nonce -> sign -> verify flow.
 */
export function useAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: sessionAddress } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 30_000,
  });

  const connected = address?.toLowerCase();
  const authed = !!connected && sessionAddress === connected;
  const needsSignIn = !!connected && !authed;

  async function signIn(): Promise<boolean> {
    if (!address) return false;
    setSigningIn(true);
    setError(null);
    try {
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error("Could not start sign-in");
      const { message } = (await nonceRes.json()) as { message: string };

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      if (!verifyRes.ok) {
        const e = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error ?? "Verification failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Sign-in failed");
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  }

  return {
    sessionAddress: sessionAddress ?? null,
    authed,
    needsSignIn,
    signingIn,
    error,
    signIn,
    signOut,
  };
}
