"use client";

import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";

/**
 * Wallet access via Abstract Global Wallet. `connect` opens the AGW login modal
 * (popup wallet - works without a browser extension); `disconnect` logs out.
 */
export function useWallet() {
  const { address, isConnected, status } = useAccount();
  const { login, logout } = useLoginWithAbstract();

  return {
    address: address?.toLowerCase() as string | undefined,
    isConnected,
    isConnecting: status === "connecting" || status === "reconnecting",
    connect: () => login(),
    disconnect: () => logout(),
  };
}
