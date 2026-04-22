import { ImageResponse } from "next/og"

export const alt = "Jukebox — Where Music Heads Listen Together"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1520 0%, #0d0b10 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          JUKEBOX
        </div>
        <div style={{ fontSize: 36, color: "#e89a3c", marginTop: 8 }}>
          Where Music Heads Listen Together
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#8a8580",
            marginTop: 32,
            letterSpacing: "0.04em",
          }}
        >
          Deep Cuts · Rare Tracks · Samples · DJ Your Own Room
        </div>
      </div>
    ),
    { ...size },
  )
}
