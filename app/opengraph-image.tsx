import { ImageResponse } from "next/og";

// Generated at build time so the share-preview image lives in code rather than
// as a committed binary. Next.js wires the og:image/twitter:image tags to this
// route automatically via the opengraph-image file convention.

export const alt = "RCCG Worship Tabernacle — Member Registration";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AMBER = "#f2a81d";
const YELLOW = "#f7c948";
const TEAL = "#2fa8a0";
const CORAL = "#e8455f";

const MARK = 132;
const ARM = 53;
const THICK = 30;

export default function Image() {
  // Two bars per corner form an L-shaped bracket; together the four brackets
  // read as the open square frame of the church mark. These are absolutely
  // positioned as direct children so each anchors to the mark box itself.
  const bars: Array<Record<string, string | number>> = [
    { backgroundColor: AMBER, top: 0, left: 0, width: ARM, height: THICK },
    { backgroundColor: AMBER, top: 0, left: 0, width: THICK, height: ARM },
    { backgroundColor: YELLOW, top: 0, right: THICK, width: ARM, height: THICK },
    { backgroundColor: YELLOW, top: 0, right: 0, width: THICK, height: ARM },
    { backgroundColor: TEAL, bottom: 0, left: 0, width: ARM, height: THICK },
    { backgroundColor: TEAL, bottom: THICK, left: 0, width: THICK, height: ARM },
    { backgroundColor: CORAL, bottom: 0, right: THICK, width: ARM, height: THICK },
    { backgroundColor: CORAL, bottom: THICK, right: 0, width: THICK, height: ARM }
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#061a18",
          backgroundImage:
            "radial-gradient(circle at 50% 12%, #145c54 0%, #0a2e2a 45%, #061a18 100%)"
        }}
      >
        <div style={{ position: "relative", width: MARK, height: MARK, display: "flex" }}>
          {bars.map((bar, i) => (
            <div key={i} style={{ position: "absolute", ...bar }} />
          ))}
        </div>

        <div
          style={{
            marginTop: 62,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#ffffff",
            textAlign: "center"
          }}
        >
          RCCG WORSHIP TABERNACLE
        </div>

        <div style={{ width: 88, height: 3, backgroundColor: TEAL, marginTop: 26 }} />

        <div style={{ marginTop: 24, fontSize: 34, color: "#c6e2de" }}>
          Member Registration
        </div>

        <div style={{ marginTop: 58, fontSize: 23, color: "#78a09b" }}>
          member.rccgwt.co.uk
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, display: "flex" }}>
          {[AMBER, YELLOW, TEAL, CORAL].map((color) => (
            <div key={color} style={{ width: size.width / 4, height: 9, backgroundColor: color }} />
          ))}
        </div>
      </div>
    ),
    size
  );
}
