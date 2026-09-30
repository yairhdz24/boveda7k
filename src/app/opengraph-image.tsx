import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "Bóveda — credenciales de cada cliente, cifradas";
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
          padding: "0 96px",
          gap: 40,
          backgroundColor: "#070908",
          backgroundImage: "radial-gradient(90% 80% at 0% 0%, rgba(62,229,140,0.22), transparent 60%)",
          color: "#eef4f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 40,
            background: "linear-gradient(145deg, #6cf0a6, #2fd57c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            boxShadow: "0 24px 60px rgba(62,229,140,0.35)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 24, height: 24, borderRadius: 12, background: "#03140a" }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>Bóveda</div>
          <div style={{ fontSize: 38, color: "#9fb0a6", maxWidth: 1008, lineHeight: 1.3 }}>{SITE_DESCRIPTION}</div>
        </div>
      </div>
    ),
    size,
  );
}
