import Link from "next/link";

export function GridMarketingFooter() {
  return (
    <footer className="grid-site-footer">
      <div className="grid-container">
        <div className="grid-footer-top">
          <div className="grid-footer-brand">
            <p className="grid-brand-name">THE GRID</p>
            <p className="grid-footer-tag">
              A battle starts in 60 seconds. Two teams or a thousand.
            </p>
          </div>
          <nav className="grid-footer-nav" aria-label="Footer">
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
              Status
            </Link>
          </nav>
        </div>

        <div className="grid-footer-legal">
          <p className="grid-footer-copy">
            © 2026 Kinetic Pillar OÜ
            <span>·</span>
            All rights reserved.
          </p>
          <p className="grid-footer-vertical">A Vertical of Kinetic Pillar Infrastructure</p>
          <p className="grid-footer-meta">
            <span>Tallinn, Estonia</span>
            <span>·</span>
            <span>Remote-first</span>
            <span>·</span>
            <span>Built for adventure.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
