"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GridLogo } from "@/components/marketing/grid-logo";

const ACCESS_HREF = "/#access";

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
        <Link href="/#hero" className="grid-brand">
          <GridLogo />
          <span className="grid-brand-name">THE GRID</span>
        </Link>
        <div className="hidden-mobile" style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <a href="/#problem" className="grid-nav-link">
            The problem
          </a>
          <a href="/#how" className="grid-nav-link">
            How it works
          </a>
          <a href="/#benefits" className="grid-nav-link">
            Benefits
          </a>
          <a href="/#try" className="grid-nav-link">
            The proof
          </a>
          <a href="/#pricing" className="grid-nav-link">
            Plans
          </a>
          <a href="/#faq" className="grid-nav-link">
            FAQ
          </a>
          <Link href={ACCESS_HREF} className="grid-cta grid-cta-sm">
            Talk to The GRID
          </Link>
        </div>
        <Link href={ACCESS_HREF} className="grid-cta grid-cta-sm grid-nav-mobile-cta">
          Talk to The GRID
        </Link>
      </div>
    </nav>
  );
}
