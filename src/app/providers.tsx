"use client";

import { useState, type ReactNode } from "react";
import { http, type Transport } from "viem";
import { abstract } from "viem/chains";
import { QueryClient } from "@tanstack/react-query";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Abstract Global Wallet provider. Wraps wagmi + react-query and registers the
 * AGW connector (a popup wallet, not a browser extension), so "Connect" opens
 * the Abstract login modal.
 *
 * The queryClient and transport are created once (stable identity) so the
 * underlying wagmi config isn't rebuilt on every render - rebuilding it drops
 * the active wallet connection.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );
  const [transport] = useState<Transport>(() =>
    http(process.env.NEXT_PUBLIC_ABSTRACT_RPC)
  );

  return (
    <AbstractWalletProvider
      chain={abstract}
      transport={transport}
      queryClient={queryClient}
    >
      <ToastProvider>{children}</ToastProvider>
    </AbstractWalletProvider>
  );
}
