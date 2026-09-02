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
            <p style={{ fontWeight: 800, letterSpacing: "0.15em", color: "#00e5ff" }}>GRID</p>
            <p
              style={{
                marginTop: 12,
                maxWidth: 380,
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(240,244,255,0.45)",
              }}
            >
              The Zero-Headcount Growth Engine.
              <br />
              <span style={{ color: "rgba(0,229,255,0.55)" }}>
                Deploy. Automate. Monetize — across 1,900+ cities.
              </span>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
            <Link href="/#access" className="grid-nav-link" style={{ textTransform: "none" }}>
              Request Private Engine Access
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
          GRID is a product of Kinetic Pillar OÜ. Field mechanics validated via Exitmania.com
          deployments across Europe.
        </p>
      </div>
    </footer>
  );
}
