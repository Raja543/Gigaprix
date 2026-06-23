"use client";

import Pusher, { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import type {
  RaceBroadcastEvent,
  RaceUpdatedEvent,
  TickAdvancedEvent,
} from "@/types/gigaverse";

let pusherSingleton: Pusher | null = null;

/** Lazily-created Pusher client (GigaSocket). Returns null if unconfigured. */
export function getPusher(): Pusher | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;

  if (!pusherSingleton) {
    pusherSingleton = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2",
      enabledTransports: ["ws", "wss"],
      activityTimeout: 30_000,
      pongTimeout: 10_000,
    });
  }
  return pusherSingleton;
}

export interface RaceChannelState {
  connected: boolean;
  tick?: TickAdvancedEvent;
  broadcast?: RaceBroadcastEvent;
}

/**
 * Subscribe to a single race's live channel: `race-{raceId}`.
 * Handles reconnection automatically via the shared Pusher client.
 */
export function useRaceChannel(raceId?: bigint | number | null): RaceChannelState {
  const [state, setState] = useState<RaceChannelState>({ connected: false });
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    if (raceId === null || raceId === undefined) return;
    const pusher = getPusher();
    if (!pusher) return;

    const name = `race-${raceId.toString()}`;
    const channel = pusher.subscribe(name);
    channelRef.current = channel;

    const onTick = (data: TickAdvancedEvent) =>
      setState((s) => ({ ...s, tick: data }));
    const onBroadcast = (data: RaceBroadcastEvent) =>
      setState((s) => ({ ...s, broadcast: data }));
    const onSubscribed = () => setState((s) => ({ ...s, connected: true }));

    channel.bind("tick-advanced", onTick);
    channel.bind("race-broadcast", onBroadcast);
    channel.bind("pusher:subscription_succeeded", onSubscribed);

    return () => {
      channel.unbind("tick-advanced", onTick);
      channel.unbind("race-broadcast", onBroadcast);
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      pusher.unsubscribe(name);
      channelRef.current = null;
    };
  }, [raceId]);

  return state;
}

/**
 * Subscribe to the global racing lobby to detect when any linked race updates.
 * Useful on bracket pages to trigger a refetch.
 */
export function useLobbyChannel(
  onRaceUpdated: (e: RaceUpdatedEvent) => void
): boolean {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onRaceUpdated);

  useEffect(() => {
    callbackRef.current = onRaceUpdated;
  }, [onRaceUpdated]);

  useEffect(() => {
    const pusher = getPusher();
    if (!pusher) return;

    const channel = pusher.subscribe("racing.lobby");
    const onUpdate = (data: RaceUpdatedEvent) => callbackRef.current(data);
    const onSubscribed = () => setConnected(true);

    channel.bind("race-updated", onUpdate);
    channel.bind("pusher:subscription_succeeded", onSubscribed);

    return () => {
      channel.unbind("race-updated", onUpdate);
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      pusher.unsubscribe("racing.lobby");
    };
  }, []);

  return connected;
}
