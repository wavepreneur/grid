import fs from "fs";
import path from "path";
import Link from "next/link";
import { EnterpriseBriefingForm } from "@/components/marketing/enterprise-briefing-form";
import { EuropeDeploymentMap } from "@/components/marketing/europe-deployment-map";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import "@/app/grid-marketing.css";

const products = [
  {
    n: "01",
    title: "GRID Studio",
    header: "No-Code Content Engine",
    text: "Convert dry corporate content, training, or city routes into interactive gamified assets in minutes.",
    accent: "#00e5ff",
  },
  {
    n: "02",
    title: "GRID Cockpit",
    header: "Autonomous Execution Loop",
    text: "Zero human oversight. Self-healing GPS/task mechanics resolve errors in real-time. Target: 0% support overhead.",
    accent: "#a78bfa",
  },
  {
    n: "03",
    title: "GRID Data",
    header: "Workforce Telemetry Asset",
    text: "Automated B2B analytics. Turn real-time player behavior into actionable benchmarks: stress resilience, decision speed, and team agility.",
    accent: "#00ff88",
  },
];

const pains = [
  {
    symbol: "◷",
    title: "Ops payroll eats the margin",
    text: "Live events still need humans watching maps, widening radii, and writing reports. That is not a product. That is a cost center.",
  },
  {
    symbol: "◎",
    title: "Training that nobody feels",
    text: "Onboarding and off-sites complete. Nobody can prove how teams actually decide, stall, or fail under pressure.",
  },
  {
    symbol: "▲",
    title: "One-off games, zero LTV",
    text: "A city event that never comes back is a sunk cost. Recurring infrastructure compounds. Staffed agencies do not.",
  },
];

const pillars = [
  {
    n: "01",
    id: "exitmania",
    title: "Exitmania",
    header: "City-scale live games",
    text: "B2C escapes and B2B team events. Shop, SEO, and checkout stay on Exitmania. GRID is the live engine that replaced Loquiz — same streets, zero ops payroll.",
    accent: "#00e5ff",
  },
  {
    n: "02",
    id: "tabbrain",
    title: "Tabbrain",
    header: "Enterprise programs",
    text: "HR and L&D book for hundreds to thousands of employees. Org billing and branding live on Tabbrain. Same GRID runtime. Players never create an account.",
    accent: "#a78bfa",
  },
  {
    n: "03",
    id: "pulse",
    title: "Micro Pulse",
    header: "Recurring 10-minute loops",
    text: "Slack and Teams challenges that keep the account alive after the off-site. REST, not sockets. The LTV layer — not a one-Saturday sunk cost.",
    accent: "#00ff88",
  },
];

const useCases = [
  {
    tag: "Onboarding",
    title: "Make the first 90 minutes unforgettable",
    text: "Fragmented roles. One team. Zero-latency sync. New hires learn how the company actually moves — not a slide deck.",
  },
  {
    tag: "Leadership",
    title: "Off-sites that produce a score, not a photo",
    text: "Decision speed and resilience under a ticking clock. The board sees behavior, not attendance.",
  },
  {
    tag: "Scale",
    title: "One engine. Every city. Every surface.",
    text: "Outdoor GPS, indoor stations, online rooms — same runtime. 1,900+ cities already stress-tested the mechanics.",
  },
];

function loadEuropeMapSvg(): string {
  const filePath = path.join(process.cwd(), "public/europe-deployment-map.svg");
  return fs.readFileSync(filePath, "utf8");
}

export function GridLandingPage() {
  const europeMapSvg = loadEuropeMapSvg();

  return (
    <div className="grid-marketing min-h-screen">
      <GridNav />

      <main>
        <section
          id="hero"
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 24px 80px",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.7,
              backgroundImage:
                "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
            aria-hidden
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(0,229,255,0.12) 0%, transparent 68%)",
            }}
            aria-hidden
          />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 980 }}>
            <div style={{ marginBottom: 22 }}>
              <span className="section-label">Private infrastructure · Outdoor · Indoor · Online</span>
            </div>
            <h1
              className="grid-h1"
              style={{
                marginBottom: 20,
                maxWidth: 980,
                marginInline: "auto",
                fontSize: "clamp(34px, 6vw, 72px)",
                lineHeight: 1.05,
              }}
            >
              <span style={{ display: "block", color: "#f0f4ff" }}>The Zero-Headcount</span>
              <span
                style={{
                  display: "block",
                  color: "#00e5ff",
                  textShadow: "0 0 48px rgba(0,229,255,0.4)",
                }}
              >
                Growth Engine.
              </span>
            </h1>
            <p
              className="grid-hero-kicker"
              style={{
                fontSize: "clamp(16px, 2.1vw, 22px)",
                color: "rgba(240,244,255,0.78)",
                maxWidth: 720,
                lineHeight: 1.45,
                margin: "0 auto 22px",
                fontWeight: 600,
              }}
            >
              Deploy, Automate &amp; Monetize Corporate Experiences Across 1,900+ Cities.
            </p>
            <p
              style={{
                fontSize: "clamp(15px, 1.8vw, 18px)",
                color: "rgba(240,244,255,0.5)",
                maxWidth: 680,
                lineHeight: 1.7,
                margin: "0 auto 36px",
              }}
            >
              Turn any corporate training, team event, or onboarding process into an automated,
              high-margin multiplayer engine. Zero operational payroll. Absolute data telemetry.{" "}
              <span style={{ color: "#f0f4ff", fontWeight: 600 }}>95%+ net margin by design.</span>
            </p>

            <div className="grid-hero-cta-row">
              <Link href="#access" className="grid-cta">
                Request Private Engine Access
              </Link>
              <Link href="#access" className="grid-cta-outline">
                Unlock 1,900-City Infrastructure
              </Link>
            </div>
            <p
              style={{
                marginTop: 16,
                marginBottom: 48,
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(240,244,255,0.35)",
              }}
            >
              Access is granted — not self-serve
            </p>

            <div className="grid-product-grid">
              {products.map((item) => (
                <article
                  key={item.title}
                  className="grid-card grid-product-card"
                  style={{
                    borderColor: `${item.accent}40`,
                    background: `linear-gradient(165deg, ${item.accent}12 0%, rgba(13,13,22,0.95) 55%)`,
                  }}
                >
                  <span className="grid-product-index" style={{ color: item.accent }}>
                    {item.n}
                  </span>
                  <p className="grid-product-name">{item.title}</p>
                  <h2 className="grid-product-header">{item.header}</h2>
                  <p className="grid-product-copy">{item.text}</p>
                </article>
              ))}
            </div>

            <div className="grid-hero-stats" style={{ marginTop: 48 }}>
              {[
                ["1,900+", "Cities"],
                ["50K+", "Teams Live"],
                ["95%+", "Margin Design"],
                ["0", "Ops Headcount"],
              ].map(([value, label]) => (
                <div key={label} className="grid-hero-stat">
                  <div className="grid-stat-value">{value}</div>
                  <div className="grid-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="problem"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span className="section-label">The leak</span>
              <h2 className="grid-h2" style={{ fontSize: "clamp(24px, 3vw, 40px)" }}>
                Staffed experiences do not scale.
                <br />
                <span style={{ color: "#00e5ff" }}>Infrastructure does.</span>
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {pains.map((item) => (
                <article key={item.title} className="grid-card">
                  <div style={{ fontSize: 24, marginBottom: 12, color: "#00e5ff" }}>{item.symbol}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 10 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "rgba(240,244,255,0.5)", lineHeight: 1.65 }}>
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="yield"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 56, maxWidth: 720, marginInline: "auto" }}>
              <span className="section-label">The yield stack</span>
              <h2 className="grid-h2">
                One runtime.
                <br />
                <span style={{ color: "#00e5ff" }}>Three revenue pillars.</span>
              </h2>
              <p className="grid-body" style={{ marginTop: 20 }}>
                Studio, Cockpit, and Data are the engine. The money sits in three products that rent
                it. Checkout never lands in GRID.
              </p>
            </div>
            <div className="grid-product-grid">
              {pillars.map((item) => (
                <article
                  key={item.id}
                  id={item.id}
                  className="grid-card grid-product-card"
                  style={{
                    borderColor: `${item.accent}40`,
                    background: `linear-gradient(165deg, ${item.accent}12 0%, rgba(13,13,22,0.95) 55%)`,
                    scrollMarginTop: 88,
                  }}
                >
                  <span className="grid-product-index" style={{ color: item.accent }}>
                    {item.n}
                  </span>
                  <p className="grid-product-name">{item.title}</p>
                  <h2 className="grid-product-header">{item.header}</h2>
                  <p className="grid-product-copy">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="deploy"
          className="grid-section"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span className="section-label">What you put on the engine</span>
              <h2 className="grid-h2">
                Not a game shop.
                <br />
                <span style={{ color: "#00e5ff" }}>A deployment catalog.</span>
              </h2>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {useCases.map((item) => (
                <article key={item.title} className="grid-card grid-card-topbar" style={{ position: "relative", padding: "28px 24px" }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#00e5ff",
                      marginBottom: 8,
                    }}
                  >
                    {item.tag}
                  </p>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: "#f0f4ff", marginBottom: 8 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 15, color: "rgba(240,244,255,0.5)", lineHeight: 1.7, maxWidth: 720 }}>
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="proof"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 64,
                alignItems: "center",
              }}
            >
              <div>
                <span className="section-label">Already in the field</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  1,900 cities
                  <br />
                  <span style={{ color: "#00e5ff" }}>before your first booking.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-cyan" />
                <p className="grid-body" style={{ marginBottom: 28 }}>
                  The mechanics were proven on real streets, real teams, real pressure. GRID turns
                  that field record into zero-ops infrastructure you can rent — not a headcount you
                  hire.
                </p>
                <Link href="#access" className="grid-cta">
                  Unlock 1,900-City Infrastructure
                </Link>
              </div>
              <EuropeDeploymentMap svgMarkup={europeMapSvg} />
            </div>
          </div>
        </section>

        <section
          id="access"
          className="grid-section"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="section-label">Private engine access</span>
              <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                You don&apos;t click buy.
                <br />
                <span style={{ color: "#00e5ff" }}>You request the keys.</span>
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(240,244,255,0.5)",
                  lineHeight: 1.65,
                  maxWidth: 560,
                  margin: "0 auto",
                }}
              >
                GRID is not a B2C shop. Access is scoped to organizations that will run the engine
                at city or enterprise scale. Briefing in, decision out — 24 hours.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                marginBottom: 40,
              }}
            >
              {[
                ["◉", "Named operator", "One counterpart for rollout — not a ticket queue"],
                ["⬡", "Your content, our engine", "Training, onboarding, or city routes — injected, not rebuilt"],
                ["◈", "Zero player accounts", "Link, name, play. Margin stays in automation."],
                ["▲", "Mutual NDA", "Available before any disclosure"],
              ].map(([symbol, title, text]) => (
                <div
                  key={title}
                  style={{
                    padding: "18px 14px",
                    background: "rgba(0,229,255,0.04)",
                    borderRadius: 10,
                    border: "1px solid rgba(0,229,255,0.12)",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 8, color: "#00e5ff" }}>{symbol}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(240,244,255,0.4)", lineHeight: 1.5 }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>
            <EnterpriseBriefingForm />
          </div>
        </section>
      </main>

      <GridMarketingFooter />
    </div>
  );
}
