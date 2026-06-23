"use client";

import { useQuery } from "@tanstack/react-query";
import type { UIGigling } from "@/types/ui";

/**
 * Batch-fetch gigling (pet) rarity + ELO for a set of pet IDs, returned as a
 * lookup keyed by petId string. Cached by the sorted id set.
 */
export function useGiglings(petIds: (string | null | undefined)[]): Record<string, UIGigling> {
  const ids = [...new Set(petIds.filter((x): x is string => !!x))].sort();
  const { data } = useQuery({
    queryKey: ["giglings", ids],
    queryFn: async () => {
      const res = await fetch(`/api/giglings?ids=${ids.join(",")}`);
      if (!res.ok) throw new Error("Failed to load giglings");
      const json = (await res.json()) as { giglings: UIGigling[] };
      const map: Record<string, UIGigling> = {};
      for (const g of json.giglings) map[g.petId] = g;
      return map;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });
  return data ?? {};
}
