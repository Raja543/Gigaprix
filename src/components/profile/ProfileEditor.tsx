"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { updateProfileAction, syncEloAction } from "@/actions/profile";

export interface ProfileValues {
  walletAddress: string;
  username: string | null;
  discord: string | null;
  twitter: string | null;
  bio: string | null;
}

/**
 * Owner-only profile controls: edit name/discord/twitter/bio and refresh real
 * ELO from Gigaverse. Renders nothing for visitors who aren't the owner.
 */
export function ProfileEditor({ profile }: { profile: ProfileValues }) {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"save" | "sync" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: profile.username ?? "",
    discord: profile.discord ?? "",
    twitter: profile.twitter ?? "",
    bio: profile.bio ?? "",
  });

  const isOwner =
    isConnected && address === profile.walletAddress.toLowerCase();
  if (!isOwner) return null;

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    const res = await updateProfileAction({
      walletAddress: profile.walletAddress,
      username: form.username || null,
      discord: form.discord || null,
      twitter: form.twitter || null,
      bio: form.bio || null,
    });
    setBusy(null);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setMsg(res.error);
    }
  }

  async function sync() {
    setBusy("sync");
    setMsg(null);
    const res = await syncEloAction();
    setBusy(null);
    if (res.ok) router.refresh();
    else setMsg(res.error);
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit profile
        </Button>
        <Button size="sm" variant="ghost" onClick={sync} disabled={busy !== null}>
          {busy === "sync" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh ELO
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="username">Display name</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="Your racer name"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="discord">Discord</Label>
          <Input
            id="discord"
            value={form.discord}
            onChange={(e) => set("discord", e.target.value)}
            placeholder="username#0000 or @handle"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="twitter">Twitter / X</Label>
          <Input
            id="twitter"
            value={form.twitter}
            onChange={(e) => set("twitter", e.target.value)}
            placeholder="@handle"
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="Tell people about your racing…"
          className="mt-1.5"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={busy !== null}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        {msg && <span className="text-sm text-danger">{msg}</span>}
      </div>
    </Card>
  );
}
