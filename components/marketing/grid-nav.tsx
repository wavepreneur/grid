"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GridLogo } from "@/components/marketing/grid-logo";

const ACCESS_HREF = "/#pricing";

export function GridNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`grid-site-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="grid-site-nav-inner">
        <Link href="/#hero" className="grid-brand" aria-label="Tells">
          <GridLogo height={36} priority />
        </Link>
        <div className="hidden-mobile" style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <a href="/#how" className="grid-nav-link">
            How it works
          </a>
          <a href="/#see" className="grid-nav-link">
            What you see
          </a>
          <a href="/#pricing" className="grid-nav-link">
            Pricing
          </a>
          <a href="/#faq" className="grid-nav-link">
            FAQ
          </a>
          <Link href={ACCESS_HREF} className="grid-cta grid-cta-sm">
            Run a session
          </Link>
        </div>
        <Link href={ACCESS_HREF} className="grid-cta grid-cta-sm grid-nav-mobile-cta">
          Run a session
        </Link>
      </div>
    </nav>
  );
}
