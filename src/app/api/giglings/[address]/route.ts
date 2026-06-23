import { NextRequest, NextResponse } from "next/server";
import { fetchPlayerGiglings } from "@/lib/gigaverse/api";
import { serializeBigInt } from "@/lib/utils";

type Ctx = { params: Promise<{ address: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { address } = await params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const giglings = await fetchPlayerGiglings(address);
  return NextResponse.json(serializeBigInt({ giglings }));
}
