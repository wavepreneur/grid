import fs from "fs";
import path from "path";
import Link from "next/link";
import { EnterpriseBriefingForm } from "@/components/marketing/enterprise-briefing-form";
import { EuropeDeploymentMap } from "@/components/marketing/europe-deployment-map";
import { GridNav } from "@/components/marketing/grid-nav";
import { MaturityBadge, type Maturity } from "@/components/marketing/maturity-badge";
import "@/app/grid-marketing.css";

const maturityLegend: { status: Maturity; label: string }[] = [
  { status: "live", label: "Production-ready" },
  { status: "beta", label: "Pilot / partial" },
  { status: "vision", label: "On the roadmap" },
];

const deploymentPillars = [
  {
    symbol: "⬡",
    title: "Zero-Ops Multiplayer",
    text: "No app downloads, no GPS requirement, no hardware logistics. Zero-Ops Multiplayer-Infrastruktur — a single browser link is all your teams need.",
    status: "live" as Maturity,
  },
  {
    symbol: "⟳",
    title: "Multiplayer Sync",
    text: "GRID connects players across multiple locations into one functional unit. Real-time interaction between home office, HQ, and field teams.",
    status: "live" as Maturity,
  },
  {
    symbol: "◷",
    title: "Time-Boxed Intensity",
    text: "60 to 90 minutes of high-concentration collaboration. Perfectly integrable into kick-offs, quarterly meetings, or global townhalls.",
    status: "beta" as Maturity,
  },
  {
    symbol: "↗",
    title: "Infinite Scale",
    text: "Whether 50 or 50,000 participants – GRID scales with your ambition. No performance degradation. No capacity limits.",
    status: "beta" as Maturity,
  },
];

const analyticsCards = [
  {
    symbol: "⚡",
    title: "Collaboration Speed",
    text: "How fast do heterogeneous teams find solutions? Benchmarked against 50,000+ data points from real deployments.",
    status: "beta" as Maturity,
  },
  {
    symbol: "◎",
    title: "Global Connection",
    text: "Are your locations connecting effectively? Measure cross-site collaboration quality in real time.",
    status: "beta" as Maturity,
  },
  {
    symbol: "▲",
    title: "Internal Benchmarking",
    text: "Leverage the global GRID high score to foster healthy, cross-team competition and continuous improvement.",
    status: "vision" as Maturity,
  },
];

const goalTracker = [
  { claim: "Zero-auth join: link + name, instant team", status: "live" as Maturity },
  { claim: "Real-time sync: state, roles, sessions", status: "live" as Maturity },
  { claim: "Self-healing sessions & device handoff", status: "live" as Maturity },
  { claim: "Asymmetric roles: Captain, GPS, teammates", status: "live" as Maturity },
  { claim: "Cross-device play (mobile + desktop)", status: "beta" as Maturity },
  { claim: "GPS experiences at Exitmania scale", status: "live" as Maturity },
  { claim: "Operator cockpit & arena live score", status: "live" as Maturity },
  { claim: "Telemetry via audit_logs", status: "beta" as Maturity },
  { claim: "Blueprint engine & creator CMS", status: "vision" as Maturity },
  { claim: "Org dashboard with department filters", status: "vision" as Maturity },
  { claim: "Post-deployment team-DNA analytics", status: "vision" as Maturity },
];

const whyGrid = [
  {
    symbol: "◈",
    title: "You create. GRID orchestrates.",
    text: "Upload your content once. GRID runs the session — roles, sync, scoring — so you focus on the experience, not the tech stack.",
  },
  {
    symbol: "⟲",
    title: "Real teamwork, not solo screens.",
    text: "Asymmetric roles split information across devices. Teams talk, decide, and move together — not parallel phone-staring.",
  },
  {
    symbol: "▲",
    title: "Live today. Measurable tomorrow.",
    text: "Zero app downloads, zero IT tickets. After the session: collaboration metrics — not just a leaderboard screenshot.",
  },
];

const howItWorks = [
  {
    step: "01",
    label: "Create",
    title: "Add your content",
    text: "Questions, PDFs, routes — drop in what your team needs. No developer required.",
  },
  {
    step: "02",
    label: "Deploy",
    title: "Publish in minutes",
    text: "One link or QR code. Teams join with a name. Roles and rooms are ready before the first minute.",
  },
  {
    step: "03",
    label: "Play",
    title: "60–90 minutes of sync",
    text: "Real-time multiplayer across phones and screens. Refresh-safe. Scale from 10 to 10,000.",
  },
];

const useCases = [
  {
    symbol: "🏢",
    title: "Corporate Teambuilding",
    text: "Remote, hybrid, or on-site — one synchronized mission that bonds teams without logistics loops.",
  },
  {
    symbol: "🚀",
    title: "New Hire Onboarding",
    text: "Culture, campus, and colleagues as an interactive rallye new hires actually remember.",
  },
  {
    symbol: "🎓",
    title: "Training & Seminars",
    text: "Replace passive slides with interaction your trainers control — participants stay in the flow.",
  },
  {
    symbol: "🌍",
    title: "Global All-Hands",
    text: "Thousands of employees, one live session. Votes and milestones unlock together across time zones.",
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
        {/* Hero */}
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
                "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,229,255,0.07) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 900 }}>
            <div style={{ marginBottom: 24 }}>
              <span className="section-label">◈ Zero-Ops Multiplayer-Infrastruktur</span>
            </div>
            <h1 className="grid-h1" style={{ marginBottom: 24, maxWidth: 900, marginInline: "auto" }}>
              <span style={{ display: "block", color: "#f0f4ff" }}>BEYOND BORDERS.</span>
              <span style={{ display: "block", color: "#f0f4ff" }}>BEYOND LIMITS.</span>
              <span
                style={{
                  display: "block",
                  color: "#00e5ff",
                  textShadow: "0 0 40px rgba(0,229,255,0.4)",
                }}
              >
                THE GRID.
              </span>
            </h1>
            <p
              style={{
                fontSize: "clamp(16px, 2.2vw, 20px)",
                color: "rgba(240,244,255,0.45)",
                maxWidth: 680,
                lineHeight: 1.65,
                margin: "0 auto 48px",
              }}
            >
              Built on the operational expertise of{" "}
              <span style={{ color: "#f0f4ff", fontWeight: 600 }}>1,900 validated city deployments</span>{" "}
              across Europe — Zero-Ops Multiplayer-Infrastruktur that syncs teams everywhere, on any device.
            </p>
            <p
              style={{
                fontSize: 15,
                color: "rgba(0,229,255,0.75)",
                maxWidth: 560,
                lineHeight: 1.6,
                margin: "-32px auto 48px",
                fontWeight: 500,
              }}
            >
              You bring the content. GRID syncs every device in the room — or across continents.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                justifyContent: "center",
                marginBottom: 80,
              }}
            >
              <Link href="/admin/dev" className="grid-cta">
                ◈ Request Access
              </Link>
              <a href="#platform" className="grid-cta-outline">
                Explore Platform ↓
              </a>
            </div>
            <div className="grid-hero-stats">
              {[
                ["1,900+", "Deployments"],
                ["50K+", "Teams Live"],
                ["0", "Zero-Ops"],
              ].map(([value, label]) => (
                <div key={label} className="grid-hero-stat">
                  <div className="grid-stat-value">{value}</div>
                  <div className="grid-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why GRID */}
        <section
          id="why"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)", paddingBlock: "clamp(64px, 8vw, 100px)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span className="section-label">Why GRID</span>
              <h2 className="grid-h2" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
                Exactly what enterprise teams need —
                <br />
                <span style={{ color: "#00e5ff" }}>without the overhead.</span>
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {whyGrid.map((item) => (
                <article key={item.title} className="grid-card">
                  <div style={{ fontSize: 24, marginBottom: 12, color: "#00e5ff" }}>{item.symbol}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 10 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.65 }}>
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Platform / Logic */}
        <section
          id="platform"
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
                <span className="section-label">The Logic</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  From the Street
                  <br />
                  <span style={{ color: "#00e5ff" }}>Into the Cloud.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-cyan" />
                <p className="grid-body" style={{ marginBottom: 20 }}>
                  We have digitized and analyzed{" "}
                  <span style={{ color: "#f0f4ff" }}>1,900 urban routes</span> across Europe. We
                  understand how teams communicate under pressure, how puzzles are solved logically,
                  and how tension is created across digital devices.
                </p>
                <p className="grid-body">
                  GRID is Zero-Ops Multiplayer-Infrastruktur — the essence of this experience. We removed
                  the physical constraints of city walls and transferred the mechanics into a borderless
                  platform. The result: an absolutely stable, location-independent system that operates
                  globally and simultaneously.
                </p>
              </div>
              <EuropeDeploymentMap svgMarkup={europeMapSvg} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span className="section-label">How it works</span>
              <h2 className="grid-h2">
                From content to
                <br />
                <span style={{ color: "#00e5ff" }}>live team mission in 60 seconds.</span>
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 24,
              }}
            >
              {howItWorks.map((item) => (
                <article key={item.step} className="grid-card" style={{ position: "relative" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: "#00e5ff",
                      marginBottom: 8,
                    }}
                  >
                    STEP {item.step} · {item.label}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", marginBottom: 10 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.65 }}>
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Deployment */}
        <section
          id="deployment"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="section-label">The Deployment</span>
              <h2 className="grid-h2">
                Synchronization
                <br />
                <span style={{ color: "#00e5ff" }}>at the Push of a Button.</span>
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {deploymentPillars.map((item) => (
                <article key={item.title} className="grid-card" style={{ position: "relative" }}>
                  <div className="grid-card-badge-slot">
                    <MaturityBadge status={item.status} />
                  </div>
                  <div style={{ fontSize: 28, marginBottom: 14, paddingRight: 72 }}>{item.symbol}</div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#f0f4ff",
                      marginBottom: 10,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.65 }}>
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section
          id="use-cases"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span className="section-label">Use Cases</span>
              <h2 className="grid-h2">
                Where GRID
                <br />
                <span style={{ color: "#00e5ff" }}>wins every time.</span>
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
              }}
            >
              {useCases.map((item) => (
                <article key={item.title} className="grid-card">
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{item.symbol}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 10 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.65 }}>
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Analytics / Intelligence */}
        <section
          id="analytics"
          className="grid-section"
          style={{
            background: "#0d0d16",
            borderTop: "1px solid rgba(0,229,255,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.35,
              backgroundImage:
                "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
            aria-hidden
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 800,
              height: 400,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.06) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="grid-container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 64,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: 16 }}>
                {analyticsCards.map((item) => (
                  <article
                    key={item.title}
                    className="grid-card grid-card-topbar"
                    style={{ position: "relative", overflow: "hidden", padding: "24px 20px" }}
                  >
                    <div className="grid-card-badge-slot">
                      <MaturityBadge status={item.status} />
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: "#00ff88",
                        marginBottom: 8,
                        letterSpacing: "-0.02em",
                        paddingRight: 72,
                      }}
                    >
                      {item.symbol}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#f0f4ff",
                        marginBottom: 6,
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.6 }}>
                      {item.text}
                    </div>
                  </article>
                ))}
              </div>
              <div>
                <span className="section-label">The Intelligence</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  More Than
                  <br />
                  <span style={{ color: "#00ff88" }}>Engagement.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-green" />
                <p className="grid-body">
                  GRID delivers what conventional events fail to provide:{" "}
                  <span style={{ color: "#f0f4ff" }}>data</span>. Behind the facade of the
                  &quot;mission,&quot; an analytics engine is at work. Receive anonymized reports
                  after every deployment covering collaboration speed, global connection quality, and
                  internal benchmarking data.
                </p>
                <div
                  style={{
                    marginTop: 32,
                    padding: "20px 24px",
                    background: "rgba(0,255,136,0.04)",
                    border: "1px solid rgba(0,255,136,0.15)",
                    borderRadius: 10,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(0,255,136,0.8)",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Post-Deployment Report
                  </p>
                  {[
                    "Avg. solution time: 4:32 min",
                    "Cross-location sync: 94%",
                    "Engagement score: 9.1 / 10",
                  ].map((line) => (
                    <div
                      key={line}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#00ff88",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, color: "rgba(240,244,255,0.45)" }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise */}
        <section
          id="enterprise"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="section-label">Enterprise Solutions</span>
              <h2 className="grid-h2" style={{ marginBottom: 20 }}>
                The Mania Strategy:
                <br />
                <span style={{ color: "#00e5ff" }}>Your Corporate Arena.</span>
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(240,244,255,0.45)",
                  maxWidth: 580,
                  margin: "0 auto",
                }}
              >
                We don&apos;t sell individual events. We integrate GRID into your organization. With
                an enterprise license, you receive a permanent, scalable infrastructure.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 40,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {[
                  ["◈", "Branded Environments", "Your own landing pages in your corporate design. Custom domains, custom color systems, custom content – all powered by GRID infrastructure."],
                  ["⟲", "Usage-Based Licensing", "Flexibly use contingents distributed throughout the year. No peak fees, no minimum commitments per quarter."],
                  ["◉", "Global Support", "24/7 coverage for your international rollouts. Dedicated enterprise success managers for organizations with 500+ employees."],
                ].map(([symbol, title, text]) => (
                  <div key={title} style={{ display: "flex", gap: 16 }}>
                    <div
                      style={{
                        flexShrink: 0,
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "rgba(0,229,255,0.08)",
                        border: "1px solid rgba(0,229,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {symbol}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff", marginBottom: 4 }}>
                        {title}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.6 }}>
                        {text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(0,255,136,0.04) 100%)",
                  border: "1px solid rgba(0,229,255,0.2)",
                  borderRadius: 16,
                  padding: "40px 32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <p style={{ fontSize: 13, color: "#00e5ff", fontWeight: 600, marginBottom: 12 }}>
                  A Product of Kinetic Pillar OÜ
                </p>
                <h3
                  style={{
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontWeight: 800,
                    lineHeight: 1.2,
                    marginBottom: 16,
                  }}
                >
                  The Mania Strategy:
                  <br />
                  Corporate Arena.
                </h3>
                <p style={{ fontSize: 14, color: "rgba(240,244,255,0.45)", lineHeight: 1.65, marginBottom: 28 }}>
                  Leverage the operational expertise and content infrastructure of Kinetic Pillar OÜ to
                  build your competitive advantage in team engagement.
                </p>
                <Link href="#briefing" className="grid-cta" style={{ width: "fit-content" }}>
                  Request Enterprise Access
                </Link>
                <p style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", marginTop: 12 }}>
                  Response within 24 hours · NDA available
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Status */}
        <section
          id="status"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(0,229,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                padding: "clamp(32px, 5vw, 48px)",
              }}
            >
              <span className="section-label">Product Status</span>
              <h2 className="grid-h2" style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 16 }}>
                Promise vs. product — kept honest
              </h2>
              <p className="grid-body" style={{ maxWidth: 560, marginBottom: 24 }}>
                What is live today, what is in progress, what is on the roadmap.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {maturityLegend.map((item) => (
                  <div
                    key={item.status}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <MaturityBadge status={item.status} />
                    <span style={{ fontSize: 12, color: "rgba(240,244,255,0.45)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {goalTracker.map((item, index) => (
                  <li
                    key={item.claim}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      padding: "16px 0",
                      borderTop: index === 0 ? "none" : "1px solid rgba(240,244,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 14, color: "rgba(240,244,255,0.85)" }}>{item.claim}</span>
                      <MaturityBadge status={item.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Briefing */}
        <section
          id="briefing"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="section-label">Enterprise Briefing</span>
              <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                Let&apos;s Talk
                <br />
                <span style={{ color: "#00e5ff" }}>Enterprise Scale.</span>
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(240,244,255,0.45)",
                  lineHeight: 1.65,
                  maxWidth: 560,
                  margin: "0 auto",
                }}
              >
                GRID is built for global organizations with 500+ employees across multiple locations.
                Tell us about your deployment scope and we will reach out within 24 hours.
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
                ["◉", "Dedicated Success Manager", "Single point of contact for your rollout"],
                ["⬡", "Custom Deployment", "Branded environments & custom domains"],
                ["◈", "Enterprise SLA", "99% uptime · 24/7 global support"],
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f0f4ff", marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(240,244,255,0.2)", lineHeight: 1.5 }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>
            <EnterpriseBriefingForm />
          </div>
        </section>
      </main>

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
                  maxWidth: 320,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "rgba(240,244,255,0.45)",
                }}
              >
                Global Digital Infrastructure for Synchronous Team Engagement.
                <br />
                <span style={{ color: "rgba(0,229,255,0.55)" }}>Zero-Ops Multiplayer-Infrastruktur</span>
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <Link href="/admin/dev" className="grid-nav-link" style={{ textTransform: "none" }}>
                Request Access
              </Link>
              <span style={{ color: "rgba(240,244,255,0.25)" }}>gridos.vercel.app</span>
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
            GRID is a product of Kinetic Pillar OÜ. Leveraging the operational expertise and content
            infrastructure of Exitmania.com.
          </p>
        </div>
      </footer>
    </div>
  );
}
