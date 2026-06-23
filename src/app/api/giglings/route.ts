import { NextRequest, NextResponse } from "next/server";
import { fetchGiglingsByIds } from "@/lib/gigaverse/api";
import { serializeBigInt } from "@/lib/utils";

/** GET /api/giglings?ids=1,2,3 - batch enrich pets with rarity + ELO. */
export async function GET(req: NextRequest) {
  const idsParam = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
  if (ids.length === 0) return NextResponse.json({ giglings: [] });

  const map = await fetchGiglingsByIds(ids.map((s) => BigInt(s)));
  return NextResponse.json(serializeBigInt({ giglings: [...map.values()] }));
}
