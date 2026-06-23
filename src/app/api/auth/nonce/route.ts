import { NextRequest, NextResponse } from "next/server";
import { issueNonce, buildSignInMessage } from "@/lib/auth/session";
import { walletSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Issue a nonce and the exact message to sign for the given wallet. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const address = (body as { address?: string })?.address;
  const parsed = walletSchema.safeParse(address);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address" }, { status: 422 });
  }

  const nonce = await issueNonce();
  const domain = req.headers.get("host") ?? "gigling-racedirector";
  const message = buildSignInMessage(parsed.data, nonce, domain);
  return NextResponse.json({ message });
}
