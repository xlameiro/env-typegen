import { ImageResponse } from "next/og";

// Edge runtime is intentional — ImageResponse initialises faster on edge.
// The build warning about "disables static generation" is expected and harmless:
// OG images are always dynamically generated and never statically pre-rendered.
export const runtime = "edge";
export const alt = "Next.js Starter Template";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
        padding: "60px",
      }}
    >
      <p
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#71717a",
          marginBottom: "16px",
          marginTop: "0px",
        }}
      >
        Starter Template
      </p>
      <h1
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "#fafafa",
          lineHeight: 1.1,
          textAlign: "center",
          maxWidth: "900px",
          margin: "0 0 24px 0",
        }}
      >
        Next.js 16 + Copilot
      </h1>
      <p
        style={{
          fontSize: 22,
          color: "#a1a1aa",
          textAlign: "center",
          maxWidth: "700px",
          lineHeight: 1.5,
          margin: "0px",
        }}
      >
        TypeScript · Tailwind CSS v4 · Auth.js v5 · Zod · Zustand · Vitest
      </p>
    </div>,
    size,
  );
}
