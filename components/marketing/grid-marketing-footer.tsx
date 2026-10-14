import Link from "next/link";
import { GridLogo } from "@/components/marketing/grid-logo";

export function GridMarketingFooter() {
  return (
    <footer className="grid-site-footer">
      <div className="grid-container">
        <div className="grid-footer-top">
          <div className="grid-footer-brand">
            <GridLogo height={40} />
            <p className="grid-footer-tag">
              Play-based team intelligence.
            </p>
          </div>
          <nav className="grid-footer-nav" aria-label="Footer">
            <Link href="/#access" className="grid-nav-link">
              Run a session
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
            Tells is a product of Kinetic Pillar Infrastructure OÜ
            <span>·</span>
            © 2026
          </p>
          <p className="grid-footer-vertical">Kinetic Pillar Infrastructure OÜ</p>
          <p className="grid-footer-meta">
            <span>Tallinn, Estonia</span>
            <span>·</span>
            <span>Remote-first</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
