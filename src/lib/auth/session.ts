import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Wallet session auth (SIWE-style).
 *
 * A session is a tamper-proof, HTTP-only cookie containing the wallet address
 * that proved ownership by signing a nonce. Server actions read the caller's
 * wallet from here - never from client-supplied arguments - so a wallet can't
 * be impersonated.
 */

const SESSION_COOKIE = "gv_session";
const NONCE_COOKIE = "gv_nonce";
const SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 days
const NONCE_TTL_S = 10 * 60; // 10 minutes

function secret(): string {
  // In production an explicit AUTH_SECRET is required (see getSessionWallet
  // callers / DEPLOY.md). The dev fallback keeps local development working.
  return process.env.AUTH_SECRET || "dev-insecure-auth-secret-change-me";
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(address: string): string {
  const exp = Date.now() + SESSION_TTL_S * 1000;
  const payload = `${address.toLowerCase()}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [address, exp, mac] = parts;
  const expected = sign(`${address}.${exp}`);
  if (
    mac.length !== expected.length ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return null;
  }
  if (Date.now() > Number(exp)) return null;
  return address;
}

/** The authenticated wallet for the current request, or null. */
export async function getSessionWallet(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? parseSessionToken(token) : null;
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setSession(address: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(address), {
    ...cookieOpts,
    maxAge: SESSION_TTL_S,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function issueNonce(): Promise<string> {
  const nonce = randomBytes(16).toString("hex");
  (await cookies()).set(NONCE_COOKIE, nonce, { ...cookieOpts, maxAge: NONCE_TTL_S });
  return nonce;
}

export async function consumeNonce(): Promise<string | null> {
  const c = await cookies();
  const nonce = c.get(NONCE_COOKIE)?.value ?? null;
  if (nonce) c.delete(NONCE_COOKIE);
  return nonce;
}

/** The exact message a wallet signs to authenticate. */
export function buildSignInMessage(
  address: string,
  nonce: string,
  domain: string
): string {
  return [
    `${domain} wants you to sign in with your Abstract wallet:`,
    address.toLowerCase(),
    "",
    "Sign in to GigaPrix. This request won't trigger a transaction or cost gas.",
    "",
    `Nonce: ${nonce}`,
  ].join("\n");
}
