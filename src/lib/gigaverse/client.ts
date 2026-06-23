import { createPublicClient, http } from "viem";
import { abstract } from "viem/chains";

/**
 * Read-only viem client for Abstract (chainId 2741).
 * Used exclusively for contract reads - the platform never writes on-chain.
 */
export const publicClient = createPublicClient({
  chain: abstract,
  transport: http(process.env.NEXT_PUBLIC_ABSTRACT_RPC),
});

export const PET_RACING_ADDRESS = (process.env.NEXT_PUBLIC_PET_RACING_ADDRESS ??
  "0x16e0B3D6394CE7597D34b73f5E5Fb165fD74394E") as `0x${string}`;
