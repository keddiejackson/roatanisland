import { ImageResponse } from "next/og";

export const alt = "Roatan Island Life - discover, map, and request Roatan experiences";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#071F2F",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(0,168,168,0.34), rgba(214,181,109,0.18) 46%, rgba(7,31,47,1))",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -160,
            top: -120,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            padding: 72,
            gap: 54,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 210,
              height: 210,
              borderRadius: 210,
              background: "white",
              border: "10px solid #D6B56D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#071F2F",
              fontSize: 96,
              fontWeight: 900,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#D6B56D",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 8,
                textTransform: "uppercase",
              }}
            >
              Roatan Island Life
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: 72,
                lineHeight: 0.96,
                fontWeight: 900,
                maxWidth: 760,
              }}
            >
              Discover, map, and request your Roatan day.
            </div>
            <div
              style={{
                marginTop: 28,
                display: "flex",
                gap: 14,
                fontSize: 24,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              <span>Tours</span>
              <span>|</span>
              <span>Stays</span>
              <span>|</span>
              <span>Transport</span>
              <span>|</span>
              <span>Local operators</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
