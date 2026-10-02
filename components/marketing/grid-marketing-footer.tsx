import Link from "next/link";

export function GridMarketingFooter() {
  return (
    <footer className="grid-site-footer">
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
            <p className="grid-brand-name">THE GRID</p>
            <p className="grid-body" style={{ marginTop: 12, maxWidth: 400, fontSize: 14 }}>
              A battle starts in 60 seconds.
              <br />
              Two teams or a thousand.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
            <Link href="/#access" className="grid-nav-link">
              Talk to The GRID
            </Link>
            <a href="https://exitmania.com" className="grid-nav-link" target="_blank" rel="noopener noreferrer">
              Play a session
            </a>
            <Link href="/login" className="grid-nav-link">
              Customer Login
            </Link>
            <Link href="/status" className="grid-footer-dev">
              STATUS DEV
            </Link>
          </div>
        </div>
        <p
          className="grid-body"
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--grid-border)",
            fontSize: 12,
          }}
        >
          The GRID is a product of Kinetic Pillar OÜ.
        </p>
      </div>
    </footer>
  );
}
