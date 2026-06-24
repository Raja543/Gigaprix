/**
 * Lightweight, dependency-free error monitoring.
 *
 * - Always logs structured errors to the console (server + client).
 * - If NEXT_PUBLIC_SENTRY_DSN is set, ships the error to Sentry via its HTTP
 *   envelope endpoint (no SDK, so it builds anywhere). Leave the DSN blank to
 *   disable remote reporting.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

interface Dsn {
  publicKey: string;
  host: string;
  projectId: string;
  protocol: string;
}

function parseDsn(dsn: string): Dsn | null {
  // https://<publicKey>@<host>/<projectId>
  const m = /^(https?):\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn.trim());
  if (!m) return null;
  return { protocol: m[1], publicKey: m[2], host: m[3], projectId: m[4] };
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

async function sendToSentry(error: unknown, context?: Record<string, unknown>) {
  const parsed = parseDsn(DSN);
  if (!parsed) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = uuid();
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    environment: process.env.NODE_ENV,
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: err.stack ? { frames: [{ function: err.stack.split("\n")[1] }] } : undefined,
        },
      ],
    },
    extra: context,
  };

  const endpoint = `${parsed.protocol}://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_key=${parsed.publicKey}&sentry_version=7`;
  const body =
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event);

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
      keepalive: true,
    });
  } catch {
    // monitoring must never throw
  }
}

/** Report an error. Safe to call from anywhere; never throws. */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  console.error("[capture]", error, context ?? "");
  if (DSN) void sendToSentry(error, context);
}
