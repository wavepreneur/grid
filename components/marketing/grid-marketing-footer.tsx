import Link from "next/link";

export function GridMarketingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(0,229,255,0.12)",
        padding: "48px 24px",
        background: "#040408",
      }}
    >
      <div className="grid-container">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 32,
          }}
        >
          <div>
            <p style={{ fontWeight: 800, letterSpacing: "0.22em", color: "#00e5ff" }}>THE GRID</p>
            <p
              style={{
                marginTop: 12,
                maxWidth: 380,
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(240,244,255,0.45)",
              }}
            >
              They&apos;re playing in 60 seconds.
              <br />
              <span style={{ color: "rgba(0,229,255,0.55)" }}>No app. No login. No IT.</span>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
            <Link href="/#access" className="grid-nav-link" style={{ textTransform: "none" }}>
              Talk to The GRID
            </Link>
            <Link href="/status" className="grid-footer-dev">
              STATUS DEV
            </Link>
          </div>
        </div>
        <p
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid rgba(240,244,255,0.08)",
            fontSize: 11,
            color: "rgba(240,244,255,0.25)",
          }}
        >
          The GRID is a product of Kinetic Pillar OÜ.
        </p>
      </div>
    </footer>
  );
}
