"use client";

import { useRef, useState } from "react";
import { ExternalLink, Tv, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Spectate the linked race using Gigaverse's own race UI, embedded in-app at a
 * large size with a native-fullscreen button. Falls back to a "watch on
 * Gigaverse" link if their site blocks embedding.
 */
export function RaceSpectator({ raceId }: { raceId: string }) {
  const [watching, setWatching] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const src = `https://gigaverse.io/racing/race/${raceId}`;

  function goFullscreen() {
    frameRef.current?.requestFullscreen?.();
  }

  if (!watching) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <Tv className="h-4 w-4 text-accent" />
        <span className="text-sm text-text-muted">
          Watch this race live, in Gigaverse&apos;s race view:
        </span>
        <Button size="sm" onClick={() => setWatching(true)}>
          <Tv className="h-4 w-4" /> Spectate here
        </Button>
        <a href={src} target="_blank" rel="noreferrer">
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-4 w-4" /> Open on Gigaverse
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Tv className="h-4 w-4 text-accent" /> Spectating race #{raceId}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goFullscreen}>
            <Maximize2 className="h-4 w-4" /> Fullscreen
          </Button>
          <a href={src} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              <ExternalLink className="h-4 w-4" /> Open on Gigaverse
            </Button>
          </a>
          <Button size="sm" variant="ghost" onClick={() => setWatching(false)}>
            Close
          </Button>
        </div>
      </div>
      {blocked ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-muted">
          Gigaverse blocked embedding this view.{" "}
          <a href={src} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Watch on Gigaverse →
          </a>
        </div>
      ) : (
        <div className="aspect-video max-h-[80vh] w-full overflow-hidden rounded-xl border border-border bg-black">
          <iframe
            ref={frameRef}
            src={src}
            className="h-full w-full"
            title={`Gigaverse race ${raceId}`}
            allow="clipboard-write; web3; fullscreen"
            allowFullScreen
            onError={() => setBlocked(true)}
          />
        </div>
      )}
    </div>
  );
}
