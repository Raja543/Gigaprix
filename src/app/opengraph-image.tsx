import { ImageResponse } from "next/og";

export const alt = "GigaPrix - Esports for Gigling Racing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#06070d",
          backgroundImage:
            "radial-gradient(900px 500px at 10% -10%, rgba(25,247,164,0.18), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(34,211,238,0.16), transparent 60%)",
          color: "#eef2f8",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #19f7a4, #22d3ee)",
              color: "#06070d",
              fontSize: 52,
              fontWeight: 900,
            }}
          >
            »
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            <span>Giga</span>
            <span style={{ color: "#19f7a4" }}>Prix</span>
          </div>
        </div>

        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          The esports layer for Gigling Racing
        </div>

        <div style={{ marginTop: 28, fontSize: 32, color: "#9aa6bd", maxWidth: 880 }}>
          Create championships & leagues, link on-chain races, crown champions.
        </div>
      </div>
    ),
    { ...size }
  );
}
