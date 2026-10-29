import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #020617 100%)",
          borderRadius: "40px",
          border: "6px solid rgba(245, 158, 11, 0.4)",
          color: "#fbbf24",
          fontSize: 88,
          fontWeight: 900,
          fontFamily: "Georgia, serif",
        }}
      >
        TT
      </div>
    ),
    {
      ...size,
    }
  );
}
