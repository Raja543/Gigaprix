"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest, boundary: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0e14",
          color: "#e6edf3",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#8b949e", maxWidth: 420 }}>
          The app hit an unexpected error. It has been logged.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#19f7a4",
            color: "#0a0e14",
            border: 0,
            borderRadius: 8,
            padding: "0.5rem 1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
