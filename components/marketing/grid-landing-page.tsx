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

const enterpriseProblems = [
  {
    symbol: "◎",
    title: "Remote silos",
    text: "Distributed teams share screens, not context. Parallel consumption masquerades as collaboration.",
  },
  {
    symbol: "◷",
    title: "Mandatory training fatigue",
    text: "Compliance and onboarding content is critical — but completion rates hide zero engagement.",
  },
  {
    symbol: "▲",
    title: "Leadership blind spot",
    text: "Executives see attendance. They cannot see how global teams actually coordinate under pressure.",
  },
];

const deploymentPillars = [
  {
    pillar: "Pillar 1",
    title: "Macro-Events",
    duration: "90 Min",
    tag: "Synchronous",
    drivers: "Tabbrain · Exitmania",
    description:
      "Live stress-tests with Alpha/Beta/Gamma roles. WebSocket FSM rooms — zero-latency coordination under pressure.",
    status: "beta" as Maturity,
    accent: "#00e5ff",
  },
  {
    pillar: "Pillar 2",
    title: "Micro-Pulses",
    duration: "10 Min",
    tag: "Asynchronous",
    drivers: "Slack · MS Teams",
    description:
      "Weekly collaboration streaks via REST — no permanent WebSockets. Stateless pulse_player_states log progress in the flow of work.",
    status: "vision" as Maturity,
    accent: "#a78bfa",
  },
];

const coreArchetypes = [
  {
    id: "01",
    slug: "ASYMMETRIC_INFORMANT",
    title: "The Asymmetric Informant",
    tag: "Collaboration",
    rule: "Forces fragmented data streams. One team, three isolated views (Alpha, Beta, Gamma). Complete information asymmetry. Solvable only through zero-latency synchronization.",
    enterpriseCase: "Post-merger cultural integration & cross-functional onboarding.",
    status: "beta" as Maturity,
    reference: "Exitmania (live reference module)",
  },
  {
    id: "02",
    slug: "TIME_DECAY_SPRINT",
    title: "The Time-Decay Sprint",
    tag: "Execution under pressure",
    rule: "Linear 90-minute stress scenarios. Scoring decays every second. Resource tokens must be strategically frozen by the team.",
    enterpriseCase: "High-stakes compliance & IT-security preparedness.",
    status: "vision" as Maturity,
  },
  {
    id: "03",
    slug: "COOPERATIVE_COLLECTIVE",
    title: "The Cooperative Collective",
    tag: "Mass mobilization",
    rule: "Asynchronous global alliance. 1,000+ players split into operational fractions making real-time majority votes to unlock unified goals over time.",
    enterpriseCase: "Global change management & strategy rollouts.",
    status: "vision" as Maturity,
  },
];

const telemetryMetrics = [
  {
    symbol: "⚡",
    title: "Hybrid Communication Friction",
    text: "Where do cross-site handoffs stall? Measure latency between roles, not individual quiz scores.",
    status: "beta" as Maturity,
  },
  {
    symbol: "◎",
    title: "Silo-Breaking Multipliers",
    text: "Quantify how often fragmented views converge into shared decisions — the signal of real teamwork.",
    status: "beta" as Maturity,
  },
  {
    symbol: "▲",
    title: "Cross-Continental Decision Latency",
    text: "Time-to-alignment across time zones and departments. Filterable by country, team, and setup.",
    status: "vision" as Maturity,
  },
];

const enginePrinciples = [
  {
    symbol: "◈",
    title: "Draft vs. live — one engine",
    text: "GRID Studio authors games (tasks, flow, GPS). Publish freezes a version snapshot. Live events bind to that snapshot — editing the draft never mutates a running mission.",
  },
  {
    symbol: "⟲",
    title: "Ephemeral rooms, zero accounts",
    text: "Teams join via link + name. No persistent user profiles. Onboarding friction drops to zero; telemetry captures behavior, not identity overhead.",
  },
  {
    symbol: "⬡",
    title: "Visual flow, not rule forms",
    text: "Drag task order, pick Linear / Rogain / Open — the compiler generates runtime logic. GPS waypoints on a map with radius. No brick-by-brick condition editor.",
  },
];

const gridStudioTracker = [
  {
    claim: "GRID Studio admin (/admin): tasks, games, templates, tickets",
    status: "beta" as Maturity,
  },
  {
    claim: "Task library: tile preview, full-image tiles, media upload",
    status: "beta" as Maturity,
  },
  {
    claim: "Game editor: settings, Spielablauf (drag order, Linear/Rogain/Open)",
    status: "beta" as Maturity,
  },
  {
    claim: "GPS waypoints per task (map, lat/lng, radius) → publish snapshot",
    status: "beta" as Maturity,
  },
  {
    claim: "Publish → studio_game_versions immutable snapshot + compiled levels",
    status: "beta" as Maturity,
  },
  {
    claim: "Live-Event starten: event binds studio_game_version_id",
    status: "beta" as Maturity,
  },
  {
    claim: "Runtime loads CMS snapshot (replaces global_levels for studio events)",
    status: "beta" as Maturity,
  },
  {
    claim: "GPS auto-checkpoint in radius (Team Lead / Alpha)",
    status: "beta" as Maturity,
  },
  {
    claim: "Lobby auto-start when roster full (solo test ≈ 3s)",
    status: "beta" as Maturity,
  },
  {
    claim: "Edit task in-context from game editor (return to game)",
    status: "beta" as Maturity,
  },
  {
    claim: "Push-to-Live: update running event from new publish (manual confirm)",
    status: "vision" as Maturity,
  },
  {
    claim: "Runtime logic engine: Rogain hide, points gates, end_game rules",
    status: "vision" as Maturity,
  },
  {
    claim: "Ticket pool → bulk event provisioning (10k+ teams scale test)",
    status: "vision" as Maturity,
  },
  {
    claim: "Exitmania checkout pilot (grid_enabled) on production traffic",
    status: "vision" as Maturity,
  },
  {
    claim: "Advanced logic UI (roles, delays, per-rule GPS) — power users only",
    status: "vision" as Maturity,
  },
];

const goalTracker = [
  { claim: "Zero-auth join: link + name, ephemeral team token", status: "live" as Maturity },
  { claim: "Real-time FSM sync: state, roles, sessions", status: "live" as Maturity },
  { claim: "Self-healing sessions & device handoff", status: "live" as Maturity },
  { claim: "Asymmetric roles: Captain, GPS, teammates (Exitmania = Archetype 01)", status: "live" as Maturity },
  { claim: "JSON content injection via global_levels / route_override", status: "beta" as Maturity },
  { claim: "Legacy JSON path (global_levels) — being superseded by GRID Studio snapshots", status: "beta" as Maturity },
  { claim: "Tabbrain enterprise booking → GRID session token provisioning", status: "beta" as Maturity },
  { claim: "Operator cockpit & arena live score", status: "live" as Maturity },
  { claim: "Telemetry via audit_logs (GRID-owned analytics)", status: "beta" as Maturity },
  { claim: "Pulse-Sprint schema: pulse_sessions + pulse_player_states (REST)", status: "beta" as Maturity },
  { claim: "domain_telemetry_metrics (sync + async unified envelope)", status: "beta" as Maturity },
  { claim: "Formal blueprint_slug routing (exitmania | tabbrain)", status: "live" as Maturity },
  { claim: "Archetype routing: TIME_DECAY_SPRINT", status: "vision" as Maturity },
  { claim: "Archetype routing: COOPERATIVE_COLLECTIVE", status: "vision" as Maturity },
  { claim: "Mission Control dashboard with department filters", status: "vision" as Maturity },
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
          <div style={{ position: "relative", zIndex: 1, maxWidth: 920 }}>
            <div style={{ marginBottom: 24 }}>
              <span className="section-label">
                ◈ The Asymmetric Team Dynamics Engine · Zero-Ops Multiplayer-Infrastruktur
              </span>
            </div>
            <h1
              className="grid-h1"
              style={{
                marginBottom: 28,
                maxWidth: 920,
                marginInline: "auto",
                fontSize: "clamp(32px, 5.5vw, 64px)",
                lineHeight: 1.08,
              }}
            >
              <span style={{ display: "block", color: "#f0f4ff" }}>
                Turn Corporate Content into
              </span>
              <span
                style={{
                  display: "block",
                  color: "#00e5ff",
                  textShadow: "0 0 40px rgba(0,229,255,0.35)",
                }}
              >
                Asymmetric Multiplayer Experiences.
              </span>
            </h1>
            <p
              style={{
                fontSize: "clamp(15px, 2vw, 18px)",
                color: "rgba(240,244,255,0.5)",
                maxWidth: 720,
                lineHeight: 1.7,
                margin: "0 auto 12px",
              }}
            >
              <span style={{ color: "#f0f4ff", fontWeight: 600 }}>
                One Engine. Zero Onboarding. Unlimited Scalability.
              </span>{" "}
              GRID injects your company&apos;s real-world scenarios into standardized psychological
              game mechanics. Test, track, and optimize global team dynamics under stress —
              independent of device, location, or timezone.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(0,229,255,0.65)",
                maxWidth: 640,
                lineHeight: 1.55,
                margin: "0 auto 32px",
                letterSpacing: "0.02em",
              }}
            >
              Runtime engine + multiplayer sync stay fixed.{" "}
              <strong style={{ color: "rgba(240,244,255,0.85)", fontWeight: 600 }}>
                GRID Studio
              </strong>{" "}
              is where you author outdoor games, tasks, GPS waypoints, and flow — then publish a
              frozen version for live events.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                maxWidth: 820,
                margin: "0 auto 40px",
                textAlign: "left",
              }}
            >
              {deploymentPillars.map((item) => (
                <article
                  key={item.title}
                  className="grid-card"
                  style={{
                    borderColor: `${item.accent}33`,
                    background: `linear-gradient(145deg, ${item.accent}08 0%, rgba(13,13,22,0.9) 100%)`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: item.accent,
                      }}
                    >
                      {item.pillar}
                    </span>
                    <MaturityBadge status={item.status} />
                  </div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#f0f4ff",
                      marginBottom: 4,
                    }}
                  >
                    {item.title}{" "}
                    <span style={{ color: item.accent, fontWeight: 600 }}>({item.duration})</span>
                  </h2>
                  <p
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(240,244,255,0.45)",
                      marginBottom: 10,
                    }}
                  >
                    {item.tag} · {item.drivers}
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(240,244,255,0.5)", lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            <p
              style={{
                fontSize: 12,
                color: "rgba(240,244,255,0.4)",
                maxWidth: 680,
                lineHeight: 1.55,
                margin: "0 auto 32px",
              }}
            >
              Global Team Intelligence Score = synchronous stress index (Macro) minus asynchronous
              daily collaboration cadence (Micro) — both streams in{" "}
              <code style={{ color: "#00e5ff" }}>domain_telemetry_metrics</code>.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                marginBottom: 64,
              }}
            >
              <Link href="#briefing" className="grid-cta">
                ◈ Deploy Your First Team Stress-Test
              </Link>
              <span style={{ fontSize: 11, color: "rgba(240,244,255,0.35)", letterSpacing: "0.08em" }}>
                6-MONTH CORPORATE BETA SANDBOX
              </span>
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

        {/* Enterprise Problem */}
        <section
          id="problem"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span className="section-label">The Enterprise Problem</span>
              <h2 className="grid-h2" style={{ fontSize: "clamp(24px, 3vw, 40px)" }}>
                B2B buyers don&apos;t search for a game tool.
                <br />
                <span style={{ color: "#00e5ff" }}>They search for a fix.</span>
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {enterpriseProblems.map((item) => (
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

        {/* Engine Philosophy */}
        <section
          id="engine"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
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
                <span className="section-label">Operating System Framework</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  Variable JSON.
                  <br />
                  <span style={{ color: "#00e5ff" }}>Fixed behavior engine.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-cyan" />
                <p className="grid-body" style={{ marginBottom: 20 }}>
                  GRID is a <span style={{ color: "#f0f4ff" }}>finite-state machine</span> that
                  orchestrates asymmetric data streams. Content is injected as JSON; the sync layer,
                  role routing, and telemetry pipeline remain constant across every deployment.
                </p>
                <p className="grid-body">
                  Enterprise customers book on{" "}
                  <span style={{ color: "#f0f4ff" }}>Tabbrain</span> — Tabbrain generates GRID
                  session tokens; players land here with zero accounts. Built on{" "}
                  <span style={{ color: "#f0f4ff" }}>1,900 validated field deployments</span>{" "}
                  (Exitmania mechanics = Archetype 01 reference).
                </p>
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                {enginePrinciples.map((item) => (
                  <article key={item.title} className="grid-card" style={{ padding: "22px 20px" }}>
                    <div style={{ fontSize: 20, marginBottom: 10, color: "#00e5ff" }}>{item.symbol}</div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff", marginBottom: 8 }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.65 }}>
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Core Archetypes */}
        <section
          id="archetypes"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span className="section-label">Core Archetypes</span>
              <h2 className="grid-h2">
                Three JSON blueprints.
                <br />
                <span style={{ color: "#00e5ff" }}>One engine contract.</span>
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(240,244,255,0.45)",
                  maxWidth: 620,
                  margin: "20px auto 0",
                  lineHeight: 1.65,
                }}
              >
                Each archetype defines mathematical constraints for state management — not a content
                editor. Your scenarios plug in; the engine enforces the rules.
              </p>
            </div>
            <div style={{ display: "grid", gap: 24 }}>
              {coreArchetypes.map((item) => (
                <article
                  key={item.slug}
                  className="grid-card grid-card-topbar"
                  style={{ position: "relative", overflow: "hidden", padding: "28px 24px" }}
                >
                  <div className="grid-card-badge-slot">
                    <MaturityBadge status={item.status} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "baseline",
                      marginBottom: 12,
                      paddingRight: 80,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: "#00e5ff",
                      }}
                    >
                      ARCHETYPE {item.id}
                    </span>
                    <code
                      style={{
                        fontSize: 10,
                        color: "rgba(0,255,136,0.75)",
                        background: "rgba(0,255,136,0.06)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {item.slug}
                    </code>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(0,229,255,0.7)",
                      marginBottom: 16,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.tag}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      color: "rgba(240,244,255,0.55)",
                      lineHeight: 1.7,
                      marginBottom: 16,
                      maxWidth: 820,
                    }}
                  >
                    <span style={{ color: "#f0f4ff", fontWeight: 600 }}>The Rule: </span>
                    {item.rule}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(240,244,255,0.4)",
                      lineHeight: 1.6,
                      padding: "12px 14px",
                      background: "rgba(0,229,255,0.04)",
                      borderRadius: 8,
                      border: "1px solid rgba(0,229,255,0.1)",
                    }}
                  >
                    <span style={{ color: "#00e5ff", fontWeight: 600 }}>Enterprise case: </span>
                    {item.enterpriseCase}
                  </p>
                  {"reference" in item && item.reference ? (
                    <p style={{ fontSize: 11, color: "rgba(52,211,153,0.65)", marginTop: 10 }}>
                      Live reference: {item.reference}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Control / Telemetry */}
        <section
          id="telemetry"
          className="grid-section"
          style={{
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
                <span className="section-label">Mission Control</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  The Telemetry
                  <br />
                  <span style={{ color: "#00ff88" }}>Dashboard.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-green" />
                <p className="grid-body" style={{ marginBottom: 20 }}>
                  <span style={{ color: "#f0f4ff", fontWeight: 600 }}>
                    Unfair advantage:
                  </span>{" "}
                  We don&apos;t track what your employees know. We track how they collaborate to find
                  the answer.
                </p>
                <p className="grid-body">
                  Metrics delivered after every deployment — filterable by department, country, and
                  team setup. The VC case: collaboration intelligence, not quiz completion rates.
                </p>
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                {telemetryMetrics.map((item) => (
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
                        fontSize: 24,
                        fontWeight: 800,
                        color: "#00ff88",
                        marginBottom: 8,
                        paddingRight: 72,
                      }}
                    >
                      {item.symbol}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f4ff", marginBottom: 6 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(240,244,255,0.45)", lineHeight: 1.6 }}>
                      {item.text}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Validated Scale */}
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
                <span className="section-label">Field-Validated</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  Stress-tested
                  <br />
                  <span style={{ color: "#00e5ff" }}>before your boardroom.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-cyan" />
                <p className="grid-body">
                  The engine inherits mechanics proven across 1,900 urban deployments — real teams,
                  real pressure, real coordination patterns. Now available as Zero-Ops
                  Multiplayer-Infrastruktur for your organization.
                </p>
              </div>
              <EuropeDeploymentMap svgMarkup={europeMapSvg} />
            </div>
          </div>
        </section>

        {/* GRID Studio */}
        <section
          id="studio"
          className="grid-section"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 48,
                alignItems: "start",
              }}
            >
              <div>
                <span className="section-label">GRID Studio</span>
                <h2 className="grid-h2" style={{ marginBottom: 20 }}>
                  Author games.
                  <br />
                  <span style={{ color: "#00e5ff" }}>Publish once. Run many.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-cyan" />
                <p className="grid-body" style={{ marginBottom: 16 }}>
                  Replaces Loquiz-style authoring inside GRID: task library, game draft, visual
                  flow (drag order + presets), GPS pins with activation radius, version publish, and
                  live events that load the snapshot — not the editable draft.
                </p>
                <p className="grid-body" style={{ marginBottom: 24, fontSize: 13 }}>
                  <strong style={{ color: "#f0f4ff" }}>Separation:</strong>{" "}
                  <code style={{ color: "#00e5ff" }}>studio_games</code> = draft ·{" "}
                  <code style={{ color: "#00e5ff" }}>studio_game_versions</code> = frozen ·{" "}
                  <code style={{ color: "#00e5ff" }}>events</code> = live run
                </p>
                <Link
                  href="/admin"
                  className="grid-cta"
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  Open GRID Studio →
                </Link>
              </div>
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(0,229,255,0.12)",
                  background: "rgba(0,0,0,0.35)",
                  padding: "clamp(24px, 4vw, 32px)",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(240,244,255,0.45)",
                    marginBottom: 20,
                    lineHeight: 1.6,
                  }}
                >
                  Studio shipped in beta — needs field QA before we call it production-ready.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {gridStudioTracker.map((item, index) => (
                    <li
                      key={item.claim}
                      style={{
                        padding: "14px 0",
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
                        <span style={{ fontSize: 13, color: "rgba(240,244,255,0.85)" }}>
                          {item.claim}
                        </span>
                        <MaturityBadge status={item.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Product Status */}
        <section
          id="status"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
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
              <span className="section-label">System of Record</span>
              <h2 className="grid-h2" style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 16 }}>
                Promise vs. engine — kept honest
              </h2>
              <p className="grid-body" style={{ maxWidth: 640, marginBottom: 24 }}>
                Engine capabilities (FSM, roles, telemetry) plus GRID Studio authoring status.
                What ships today, what runs in pilot, what the archetype roadmap targets.
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
                  <div key={item.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="section-label">Corporate Beta Sandbox</span>
              <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                Deploy your first
                <br />
                <span style={{ color: "#00e5ff" }}>team stress-test.</span>
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
                6-month sandbox for organizations with 500+ employees. Inject your scenarios, run
                asymmetric sessions, receive collaboration telemetry — no game studio required.
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
                ["⬡", "JSON Blueprint Injection", "Your content, our fixed engine contract"],
                ["◈", "Ephemeral Team Rooms", "Zero persistent accounts · link-driven join"],
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
                  maxWidth: 360,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "rgba(240,244,255,0.45)",
                }}
              >
                The Asymmetric Team Dynamics Engine.
                <br />
                <span style={{ color: "rgba(0,229,255,0.55)" }}>
                  Zero-Ops Multiplayer-Infrastruktur
                </span>
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <Link href="#briefing" className="grid-nav-link" style={{ textTransform: "none" }}>
                Deploy Stress-Test
              </Link>
              <span style={{ color: "rgba(240,244,255,0.25)" }}>gridos.vercel.app · System of Record</span>
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
            GRID is a product of Kinetic Pillar OÜ. Field mechanics validated via Exitmania.com
            deployments across Europe.
          </p>
        </div>
      </footer>
    </div>
  );
}
