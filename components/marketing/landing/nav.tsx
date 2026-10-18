"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GridLogo } from "@/components/marketing/grid-logo";
import { copy, LINKS } from "@/components/marketing/landing/copy";

export function LandingNav() {
  const t = copy.nav;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`tl-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="tl-nav-inner">
        <Link href="/" className="tl-nav-brand" aria-label="Tells">
          <GridLogo height={24} priority />
        </Link>
        <nav className="tl-nav-links" aria-label="Main">
          <a href="#how">{t.how}</a>
          <a href="#report">{t.report}</a>
          <a href="#pricing">{t.pricing}</a>
          <a href="#faq">{t.faq}</a>
        </nav>
        <div className="tl-nav-actions">
          <Link href={LINKS.login} className="tl-nav-login">
            {t.login}
          </Link>
          <Link href={LINKS.contact} className="tl-btn tl-btn-primary tl-btn-sm">
            {t.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}
