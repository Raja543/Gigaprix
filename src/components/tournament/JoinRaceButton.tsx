"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PET_RACING_ABI, PET_RACING_ADDRESS } from "@/lib/gigaverse/abi";
import type { UIMatch, UITournamentFull } from "@/types/ui";

/**
 * Join the heat's linked Gigaverse race with your gigling, signed from the site.
 */
export function JoinRaceButton({
  match,
}: {
  match: UIMatch;
  tournament: UITournamentFull;
}) {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [err, setErr] = useState<string | null>(null);

  const myEntry = match.entries.find(
    (e) => e.user.walletAddress === address?.toLowerCase()
  );
  const [petId, setPetId] = useState(myEntry?.petId ?? "");

  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
  });
  const refreshed = useRef(false);
  useEffect(() => {
    if (receipt && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [receipt, router]);

  if (!match.raceId || !myEntry) return null;
  if (match.status === "COMPLETED" || match.status === "BYE") return null;

  const busy = isPending || confirming;
  const joined = !!receipt;

  async function join() {
    if (!/^\d+$/.test(String(petId).trim())) {
      setErr("Enter a valid gigling (pet) ID.");
      return;
    }
    setErr(null);
    try {
      const rid = BigInt(match.raceId!);
      const pid = BigInt(String(petId).trim());
      const h = await writeContractAsync({
        address: PET_RACING_ADDRESS,
        abi: PET_RACING_ABI,
        functionName: "joinRace",
        args: [rid, pid, "0x"],
        value: 0n,
      });
      setHash(h);
    } catch (e) {
      setErr(e instanceof Error ? e.message.split("\n")[0] : "Transaction failed");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={String(petId)}
          onChange={(e) => setPetId(e.target.value)}
          placeholder="Your gigling ID"
          className="w-40 font-mono"
        />
        <Button onClick={join} disabled={busy || joined}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {joined ? "Joined" : busy ? "Joining…" : "Join race"}
        </Button>
      </div>
      {joined && <p className="text-sm text-primary">Joined the race!</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}
