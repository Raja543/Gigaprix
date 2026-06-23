import { NextRequest, NextResponse } from "next/server";
import {
  consumeNonce,
  buildSignInMessage,
  setSession,
} from "@/lib/auth/session";
import { publicClient } from "@/lib/gigaverse/client";
import { walletSchema } from "@/lib/validation";
import { captureError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

/**
 * Verify a signed sign-in message and start a session. Works for EOAs and
 * Abstract smart accounts (viem `verifyMessage` covers EIP-1271 / EIP-6492).
 */
export async function POST(req: NextRequest) {
  let body: { address?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = walletSchema.safeParse(body.address);
  if (!parsed.success || !body.signature) {
    return NextResponse.json({ error: "Missing address or signature" }, { status: 422 });
  }
  const address = parsed.data;

  const nonce = await consumeNonce();
  if (!nonce) {
    return NextResponse.json(
      { error: "No nonce - request a new sign-in." },
      { status: 401 }
    );
  }

  const domain = req.headers.get("host") ?? "gigling-racedirector";
  const message = buildSignInMessage(address, nonce, domain);

  try {
    const valid = await publicClient.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: body.signature as `0x${string}`,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    captureError(err, { route: "auth/verify", address });
    return NextResponse.json(
      { error: "Could not verify signature" },
      { status: 401 }
    );
  }

  await setSession(address);
  return NextResponse.json({ ok: true, address: address.toLowerCase() });
}
