import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Current session wallet (or null). */
export async function GET() {
  const address = await getSessionWallet();
  return NextResponse.json({ address });
}
