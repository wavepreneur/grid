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
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(4, 4, 8, 0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,229,255,0.12)" : "1px solid transparent",
        transition: "all 0.3s ease",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/#hero" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <GridLogo />
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "0.15em", color: "#00e5ff" }}>
            GRID
          </span>
        </Link>
        <div className="hidden-mobile" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="/#exitmania" className="grid-nav-link">
            Exitmania
          </a>
          <a href="/#tabbrain" className="grid-nav-link">
            Tabbrain
          </a>
          <a href="/#pulse" className="grid-nav-link">
            Micro Pulse
          </a>
          <Link href={ACCESS_HREF} className="grid-cta grid-cta-sm">
            Request Private Engine Access
          </Link>
        </div>
        <Link href={ACCESS_HREF} className="grid-cta grid-cta-sm grid-nav-mobile-cta">
          Request Access
        </Link>
      </div>
    </nav>
  );
}
