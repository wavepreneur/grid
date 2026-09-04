import fs from "fs";
import path from "path";
import Link from "next/link";
import { EnterpriseBriefingForm } from "@/components/marketing/enterprise-briefing-form";
import { EuropeDeploymentMap } from "@/components/marketing/europe-deployment-map";
import { GridFaq } from "@/components/marketing/grid-faq";
import { GridHowItWorks } from "@/components/marketing/grid-how-it-works";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import "@/app/grid-marketing.css";

const problems = [
  {
    title: "Someone still has to run the back room",
    text: "Codes, maps, who is stuck, who finished. If a person has to watch that, the event does not scale — and the cost sits on every booking.",
  },
  {
    title: "Afterward you only have a winner",
    text: "Most tools rank individuals. You get a photo and a high score. You do not know if the team understood the task, stalled, or never reached the place.",
  },
  {
    title: "Street, building, and laptop are three products",
    text: "Outdoor in one tool. Indoor in another. Online in a third. Ten people on Saturday and thousands over a year never live in the same system — so nothing adds up.",
  },
];

const benefits = [
  {
    n: "01",
    title: "The event starts when they open the link",
    text: "No install. No account. No ticket to IT. You keep the budget that used to pay people to babysit software.",
    accent: "#00e5ff",
  },
  {
    n: "02",
    title: "They play. You see the team.",
    text: "It feels like a game. Afterward you see if the task landed, where the group broke, whether they were actually there, and if the roles you set held. That is something you can act on.",
    accent: "#a78bfa",
  },
  {
    n: "03",
    title: "Ten people or fifty thousand. Same GRID.",
    text: "Outdoor, indoor, or online. One event or a year-long program. You do not buy a new stack every time the group gets bigger.",
    accent: "#00ff88",
  },
];

const uses = [
  {
    n: "01",
    id: "exitmania",
    name: "Exitmania",
    href: "https://exitmania.com",
    external: true,
    header: "Self-guided city events",
    text: "Outdoor, indoor, or online. Up to ten per team, up to a hundred in one run. You book and get the mail on Exitmania. The GRID starts the room and shows whether the group actually did the route.",
    cta: "exitmania.com",
    accent: "#00e5ff",
  },
  {
    n: "02",
    id: "tabbrain",
    name: "Tabbrain",
    href: "https://tabbrain.com",
    external: true,
    header: "Company programs, year-round",
    text: "Thousands over a year — not everyone at once. Teams of one to ten, one shared entry. Scores by country and department. You buy on Tabbrain. The GRID is the live room and the group record.",
    cta: "tabbrain.com",
    accent: "#a78bfa",
  },
  {
    n: "03",
    id: "partners",
    name: "Partner pages",
    href: "#access",
    external: false,
    header: "Your brand. The GRID underneath.",
    text: "Your site, your questions, a short Pulse in Slack. You keep checkout and look. The GRID runs multiplayer and connects the data. Write us — we plug you in.",
    cta: "Write to The GRID",
    accent: "#00ff88",
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
          <div className="grid-hero-scan" aria-hidden />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 980 }}>
            <p
              style={{
                marginBottom: 18,
                fontSize: "clamp(13px, 1.6vw, 15px)",
                fontWeight: 800,
                letterSpacing: "0.42em",
                color: "#00e5ff",
              }}
            >
              THE GRID
            </p>
            <h1
              className="grid-h1"
              style={{
                marginBottom: 20,
                maxWidth: 980,
                marginInline: "auto",
                fontSize: "clamp(32px, 5.4vw, 64px)",
                lineHeight: 1.06,
              }}
            >
              <span style={{ display: "block", color: "#f0f4ff" }}>They&apos;re playing in 60 seconds.</span>
              <span
                style={{
                  display: "block",
                  color: "#00e5ff",
                  textShadow: "0 0 48px rgba(0,229,255,0.4)",
                }}
              >
                No app. No login. No IT.
              </span>
            </h1>
            <p
              className="grid-hero-kicker"
              style={{
                fontSize: "clamp(16px, 2.1vw, 21px)",
                color: "rgba(240,244,255,0.78)",
                maxWidth: 720,
                lineHeight: 1.5,
                margin: "0 auto 36px",
                fontWeight: 600,
              }}
            >
              The GRID is the live room for team events. Send a link. Every phone joins. When it
              ends, you see how the group actually did — ten people or fifty thousand.
            </p>

            <div className="grid-hero-cta-row">
              <Link href="#access" className="grid-cta">
                Talk to The GRID
              </Link>
              <Link href="#how" className="grid-cta-outline">
                See how it works
              </Link>
            </div>
          </div>
        </section>

        <section
          id="problem"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 720, marginInline: "auto" }}>
              <span className="section-label">Why most team events stall</span>
              <h2 className="grid-h2">
                Hard to start.
                <br />
                <span style={{ color: "#00e5ff" }}>Useless when they end.</span>
              </h2>
            </div>
            <div className="grid-product-grid">
              {problems.map((item) => (
                <article key={item.title} className="grid-card">
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#f0f4ff", marginBottom: 10 }}>
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
          id="how"
          className="grid-section grid-section-grid-bg"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 740, marginInline: "auto" }}>
              <span className="section-label">How The GRID works</span>
              <h2 className="grid-h2">
                You send a link.
                <br />
                <span style={{ color: "#00e5ff" }}>The GRID runs the room.</span>
              </h2>
              <p className="grid-body" style={{ marginTop: 20 }}>
                Outdoor, indoor, or online — one system. Nobody creates an account. Nobody watches
                a map for you. After play you read the group, not a list of high-scorers.
              </p>
            </div>
            <GridHowItWorks />
          </div>
        </section>

        <section
          id="benefits"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 720, marginInline: "auto" }}>
              <span className="section-label">What you get</span>
              <h2 className="grid-h2">
                An event that starts itself.
                <br />
                <span style={{ color: "#00e5ff" }}>A team you can actually read.</span>
              </h2>
            </div>
            <div className="grid-product-grid">
              {benefits.map((item) => (
                <article
                  key={item.n}
                  className="grid-card grid-product-card"
                  style={{
                    borderColor: `${item.accent}40`,
                    background: `linear-gradient(165deg, ${item.accent}12 0%, rgba(13,13,22,0.95) 55%)`,
                  }}
                >
                  <span className="grid-product-index" style={{ color: item.accent }}>
                    {item.n}
                  </span>
                  <h2 className="grid-product-header">{item.title}</h2>
                  <p className="grid-product-copy">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="now"
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
                marginBottom: 64,
              }}
            >
              <div>
                <span className="section-label">Why this exists now</span>
                <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                  You cannot put a host
                  <br />
                  <span style={{ color: "#00e5ff" }}>in every team.</span>
                </h2>
                <div className="grid-accent-line grid-accent-line-cyan" />
                <p className="grid-body" style={{ marginBottom: 16 }}>
                  Phones no longer need an app to play together. Companies will not staff a
                  facilitator for every group. And a photo after the off-site is not proof that
                  the team did the work.
                </p>
                <p className="grid-body">
                  The GRID is the live room underneath: street, building, or browser. One to fifty
                  thousand. The record is the group.
                </p>
              </div>
              <EuropeDeploymentMap svgMarkup={europeMapSvg} />
            </div>

            <div
              id="runs"
              style={{
                textAlign: "center",
                marginBottom: 40,
                maxWidth: 680,
                marginInline: "auto",
                scrollMarginTop: 88,
              }}
            >
              <span className="section-label">Where The GRID runs</span>
              <h2 className="grid-h2" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
                Same room.
                <br />
                <span style={{ color: "#00e5ff" }}>Three ways in.</span>
              </h2>
            </div>
            <div className="grid-product-grid">
              {uses.map((item) => (
                <a
                  key={item.id}
                  id={item.id}
                  href={item.href}
                  {...(item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="grid-card grid-product-card"
                  style={{
                    borderColor: `${item.accent}40`,
                    background: `linear-gradient(165deg, ${item.accent}12 0%, rgba(13,13,22,0.95) 55%)`,
                    scrollMarginTop: 88,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span className="grid-product-index" style={{ color: item.accent }}>
                    {item.n}
                  </span>
                  <p className="grid-product-name">{item.name}</p>
                  <h2 className="grid-product-header">{item.header}</h2>
                  <p className="grid-product-copy">{item.text}</p>
                  <p
                    style={{
                      marginTop: "auto",
                      paddingTop: 16,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: item.accent,
                    }}
                  >
                    {item.cta} →
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="grid-section"
          style={{ background: "#0d0d16", borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 40, maxWidth: 640, marginInline: "auto" }}>
              <span className="section-label">Questions</span>
              <h2 className="grid-h2">
                Straight answers.
              </h2>
            </div>
            <GridFaq />
          </div>
        </section>

        <section
          id="access"
          className="grid-section"
          style={{ borderTop: "1px solid rgba(0,229,255,0.12)" }}
        >
          <div className="grid-container">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="section-label">Get in</span>
              <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                If you run team events,
                <br />
                <span style={{ color: "#00e5ff" }}>talk to The GRID.</span>
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
                Players never land on this page. You do. We reply within 24 hours.
              </p>
            </div>
            <EnterpriseBriefingForm />
          </div>
        </section>
      </main>

      <GridMarketingFooter />
    </div>
  );
}
