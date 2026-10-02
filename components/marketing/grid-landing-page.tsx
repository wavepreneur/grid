import Link from "next/link";
import { MousePointerClick, Scale, Trophy } from "lucide-react";
import { EnterpriseBriefingForm } from "@/components/marketing/enterprise-briefing-form";
import { GridBenefits } from "@/components/marketing/grid-benefits";
import { GridFaq } from "@/components/marketing/grid-faq";
import { GridHeroLive } from "@/components/marketing/grid-hero-live";
import { GridHowItWorks } from "@/components/marketing/grid-how-it-works";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import { GridPricing } from "@/components/marketing/grid-pricing";
import { GridReveal } from "@/components/marketing/grid-reveal";
import "@/app/grid-marketing.css";

const problems = [
  {
    title: "A few clicks cannot start a thousand people",
    text: "Self-guided team events for large groups still need a host, a briefing, and a week of setup. Nobody starts that on a Friday afternoon.",
    icon: MousePointerClick,
  },
  {
    title: "Afterward you only have a winner",
    text: "A photo. A high score. You do not learn if the team worked, where to improve, or how countries and departments actually play together.",
    icon: Trophy,
  },
  {
    title: "Scale and insight never meet",
    text: "Tools that scale have no record. Tools with a record do not scale. The room of twelve is staffed. The room of a thousand is empty.",
    icon: Scale,
  },
];

export function GridLandingPage() {
  return (
    <div className="grid-marketing grid-marketing-studio min-h-screen">
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
              opacity: 0.85,
              backgroundImage:
                "linear-gradient(oklch(0.46 0.093 178 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(0.46 0.093 178 / 0.05) 1px, transparent 1px)",
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
                "radial-gradient(ellipse 70% 55% at 50% 42%, oklch(0.46 0.093 178 / 0.1) 0%, transparent 68%)",
            }}
            aria-hidden
          />
          <div className="grid-hero-scan" aria-hidden />
          <div className="grid-orb grid-orb-a" aria-hidden />
          <div className="grid-orb grid-orb-b" aria-hidden />
          <div className="grid-orb grid-orb-c" aria-hidden />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 980 }}>
            <p
              className="section-label"
              style={{ letterSpacing: "0.42em", marginBottom: 18 }}
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
              <span style={{ display: "block" }}>A battle starts in 60 seconds.</span>
              <span style={{ display: "block", color: "var(--grid-cyan)" }}>
                Two teams or a thousand.
              </span>
            </h1>
            <p
              className="grid-body"
              style={{
                fontSize: "clamp(16px, 2.1vw, 21px)",
                maxWidth: 720,
                lineHeight: 1.5,
                margin: "0 auto 36px",
                fontWeight: 600,
                opacity: 0.78,
              }}
            >
              No app. No login. No IT. Send a link. Every phone joins.
              When it ends, you see whether the team actually worked.
            </p>

            <div className="grid-hero-cta-row">
              <Link href="#access" className="grid-cta">
                Talk to The GRID
              </Link>
              <Link href="#how" className="grid-cta-outline">
                See how it works
              </Link>
            </div>
            <GridHeroLive />
          </div>
        </section>

        <section id="problem" className="grid-section" style={{ background: "var(--grid-bg-elevated)" }}>
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 720, marginInline: "auto" }}>
                <span className="section-label">Why most team events stall</span>
                <h2 className="grid-h2">
                  Hard to start.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>Empty when they end.</span>
                </h2>
              </div>
            </GridReveal>
            <div className="grid-product-grid">
              {problems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <GridReveal key={item.title} delay={index * 90}>
                    <article className="grid-card grid-problem-card">
                      <span className="grid-benefit-icon" aria-hidden>
                        <Icon size={22} strokeWidth={1.75} />
                      </span>
                      <h3 className="grid-product-header" style={{ fontSize: 20 }}>
                        {item.title}
                      </h3>
                      <p className="grid-product-copy">{item.text}</p>
                    </article>
                  </GridReveal>
                );
              })}
            </div>
            <GridReveal delay={200}>
              <p className="grid-body" style={{ marginTop: 36, textAlign: "center", maxWidth: 560, marginInline: "auto" }}>
                The GRID closes that gap. Simple to run. Strong at scale.
                The record goes past the game.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="how" className="grid-section grid-section-grid-bg">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 740, marginInline: "auto" }}>
                <span className="section-label">How The GRID works</span>
                <h2 className="grid-h2">
                  You send a link.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>The GRID runs the room.</span>
                </h2>
                <p className="grid-body" style={{ marginTop: 20 }}>
                  No host. No accounts. Up to two hours — one team or thousands.
                  After play you read the group: if it worked, and where to get better.
                </p>
              </div>
            </GridReveal>
            <GridReveal delay={80}>
              <GridHowItWorks />
            </GridReveal>
          </div>
        </section>

        <section id="benefits" className="grid-section grid-benefits-section">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 720, marginInline: "auto" }}>
                <span className="section-label">What you get</span>
                <h2 className="grid-h2">
                  One link.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>Fifty thousand people.</span>
                </h2>
              </div>
            </GridReveal>
            <GridBenefits />
          </div>
        </section>

        <section id="now" className="grid-section grid-section-grid-bg">
          <div className="grid-container" style={{ maxWidth: 800, textAlign: "center" }}>
            <GridReveal>
              <span className="section-label">The gap</span>
              <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                Where else do thousands
                <br />
                <span style={{ color: "var(--grid-cyan)" }}>spend two hours — with no host?</span>
              </h2>
              <p className="grid-body" style={{ marginBottom: 16 }}>
                And leave you with something the business can use. Not a photo.
                Whether teams work. Where to improve. Across countries and departments.
              </p>
              <p className="grid-body">
                That room did not exist. The GRID is that room.
                Easy to run. Built to scale. The results go past the game.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="try" className="grid-section" style={{ background: "var(--grid-bg-elevated)" }}>
          <div className="grid-container">
            <GridReveal>
            <div className="grid-card grid-try-card" style={{ padding: "clamp(28px, 5vw, 48px)", maxWidth: 800, marginInline: "auto" }}>
              <span className="section-label">The proof</span>
              <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                Exitmania already runs
                <br />
                <span style={{ color: "var(--grid-cyan)" }}>one team — or thousands.</span>
              </h2>
              <p className="grid-body" style={{ marginBottom: 28, maxWidth: 560 }}>
                Book an outdoor game in the city you choose, an indoor game, or an online
                game. Start with one team. Feel the join, the play, the end.
                Same room The GRID keeps for the company.
              </p>
              <div className="grid-hero-cta-row" style={{ justifyContent: "flex-start" }}>
                <a
                  href="https://exitmania.com"
                  className="grid-cta"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Play a session
                </a>
                <Link href="#access" className="grid-cta-outline">
                  Or talk to The GRID
                </Link>
              </div>
            </div>
            </GridReveal>
          </div>
        </section>

        <section id="pricing" className="grid-section grid-section-grid-bg">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 720, marginInline: "auto" }}>
                <span className="section-label">Plans</span>
                <h2 className="grid-h2">
                  Pay monthly. Save 20% yearly.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>Try a live event first.</span>
                </h2>
              </div>
            </GridReveal>
            <GridReveal delay={80}>
              <GridPricing />
            </GridReveal>
          </div>
        </section>

        <section id="faq" className="grid-section" style={{ background: "var(--grid-bg-elevated)" }}>
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 40, maxWidth: 640, marginInline: "auto" }}>
                <span className="section-label">Questions</span>
                <h2 className="grid-h2">Straight answers.</h2>
              </div>
            </GridReveal>
            <GridReveal delay={60}>
              <GridFaq />
            </GridReveal>
          </div>
        </section>

        <section id="access" className="grid-section">
          <div className="grid-container" style={{ maxWidth: 880 }}>
            <GridReveal>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="section-label">Get in</span>
              <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                If you run team events,
                <br />
                <span style={{ color: "var(--grid-cyan)" }}>talk to The GRID.</span>
              </h2>
              <p className="grid-body" style={{ maxWidth: 560, margin: "0 auto" }}>
                Players never land on this page. You do. Twenty minutes, no commitment.
                We reply within 24 hours.
              </p>
            </div>
            <EnterpriseBriefingForm />
            </GridReveal>
          </div>
        </section>
      </main>

      <GridMarketingFooter />
    </div>
  );
}
