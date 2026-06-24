/**
 * PetRacingSystem ABI (subset). Shared by server reads (viem) and client
 * writes (wagmi). Reads validate races/results; writes let a connected wallet
 * create and join races directly from the site.
 */
export const PET_RACING_ABI = [
  // ─── Reads ──────────────────────────────────────────────
  {
    type: "function",
    name: "getRacePhase",
    stateMutability: "view",
    inputs: [{ name: "raceId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "getRacePets",
    stateMutability: "view",
    inputs: [{ name: "raceId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getRaceFinalRanking",
    stateMutability: "view",
    inputs: [{ name: "raceId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getRaceFinishTimes",
    stateMutability: "view",
    inputs: [{ name: "raceId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getPetOwnerInRace",
    stateMutability: "view",
    inputs: [
      { name: "raceId", type: "uint256" },
      { name: "petId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getCreatorFeeBounds",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "minBps", type: "uint256" },
      { name: "maxBps", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getRaceLimits",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "maxPetsPerRace", type: "uint256" },
          { name: "maxTrackLength", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "canPetRace",
    stateMutability: "view",
    inputs: [
      { name: "petId", type: "uint256" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // ─── Writes ─────────────────────────────────────────────
  {
    type: "function",
    name: "createRace",
    stateMutability: "payable",
    inputs: [
      { name: "fieldSize", type: "uint256" },
      { name: "trackLength", type: "uint256" },
      { name: "entryFeeWei", type: "uint256" },
      { name: "creatorFeeBps", type: "uint256" },
      { name: "payoutDistribution", type: "uint256[]" },
      { name: "joinHook", type: "address" },
      { name: "extraParamIds", type: "uint256[]" },
      { name: "extraParamVals", type: "uint256[]" },
    ],
    outputs: [{ name: "raceId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinRace",
    stateMutability: "payable",
    inputs: [
      { name: "raceId", type: "uint256" },
      { name: "petId", type: "uint256" },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [],
  },
  // ─── Events ─────────────────────────────────────────────
  {
    type: "event",
    name: "RaceCreated",
    inputs: [
      { name: "raceId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "fieldSize", type: "uint256", indexed: false },
      { name: "trackLength", type: "uint256", indexed: false },
      { name: "entryFee", type: "uint256", indexed: true },
      { name: "seedPool", type: "uint256", indexed: false },
      { name: "creatorFeeBps", type: "uint256", indexed: false },
    ],
  },
] as const;

export const PET_RACING_ADDRESS = (process.env.NEXT_PUBLIC_PET_RACING_ADDRESS ??
  "0x16e0B3D6394CE7597D34b73f5E5Fb165fD74394E") as `0x${string}`;
