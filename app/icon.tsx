import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Generated app icon (favicon). Replace with your own branding.
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
 */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#171717",
        borderRadius: 6,
        color: "#ffffff",
        fontSize: 18,
        fontWeight: 700,
        fontFamily: "sans-serif",
      }}
    >
      N
    </div>,
    size,
  );
}
