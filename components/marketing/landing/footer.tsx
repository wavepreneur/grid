import Link from "next/link";
import { GridLogo } from "@/components/marketing/grid-logo";
import { copy, LINKS } from "@/components/marketing/landing/copy";

export function LandingFooter() {
  const t = copy.footer;
  return (
    <footer className="tl-footer">
      <div className="tl-container tl-footer-inner">
        <div>
          <GridLogo height={22} />
          <p className="tl-small">{t.tag}</p>
        </div>
        <nav className="tl-footer-links" aria-label="Footer">
          <Link href={LINKS.contact}>{t.links.session}</Link>
          <Link href={LINKS.report}>{t.links.report}</Link>
          <a href={LINKS.playFirst} target="_blank" rel="noopener noreferrer">
            {t.links.playFirst}
          </a>
          <Link href={LINKS.login}>{t.links.login}</Link>
          <Link href={LINKS.imprint}>{t.links.imprint}</Link>
        </nav>
      </div>
      <div className="tl-container">
        <p className="tl-footer-legal">{t.legal}</p>
      </div>
    </footer>
  );
}
