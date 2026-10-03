import Link from "next/link";
import { Camera, Smartphone, Users } from "lucide-react";
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
    title: "No one can just start.",
    text: "Today you need a host, a tool, an app IT will not install. Phone-only people sit out. Laptop-only people sit out. The room never opens.",
    icon: Smartphone,
  },
  {
    title: "Fun. Then a photo.",
    text: "Today nobody learns how the team works. The booker leaves with nothing for Monday.",
    icon: Camera,
  },
  {
    title: "Two people. Or fifty thousand.",
    text: "Today you pick twelve, or you pick scale. Nothing does both. Nothing is yours to shape.",
    icon: Users,
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
            padding: "108px 24px 64px",
            textAlign: "center",
            overflow: "visible",
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
                <span className="section-label">Why The GRID exists</span>
                <h2 className="grid-h2">
                  Team events still fail.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>That is the gap.</span>
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
                So we built The GRID. A link. Any device.
                Two people or fifty thousand. A record you can use.
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
                  They play.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>You get what no host can see.</span>
                </h2>
                <p className="grid-body" style={{ marginTop: 20 }}>
                  Roles pull on each other. Every attempt is kept. A coach cannot
                  watch this many people — and cannot go this deep. Seconds after
                  the last move, the record is already there.
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
              <div className="grid-try">
                <span className="section-label">The proof</span>
                <h2 className="grid-h2">
                  Exitmania already runs
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>one team — or thousands.</span>
                </h2>
                <p className="grid-body">
                  Book a game and play today. Outdoor in the city you pick,
                  indoor, or online. Same room The GRID keeps for the company.
                </p>

                <div className="grid-try-surfaces">
                  <a
                    href="https://exitmania.com"
                    className="grid-try-surface"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>Outdoor</strong>
                    <span>A city. A route. Your phones.</span>
                  </a>
                  <a
                    href="https://exitmania.com"
                    className="grid-try-surface"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>Indoor</strong>
                    <span>Stations. Codes. One building.</span>
                  </a>
                  <a
                    href="https://exitmania.com"
                    className="grid-try-surface"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <strong>Online</strong>
                    <span>Same room. Anywhere.</span>
                  </a>
                </div>

                <p className="grid-try-price">
                  From <strong>€9.90</strong> per person
                  <span>1,900+ cities · start after booking</span>
                </p>

                <div className="grid-hero-cta-row">
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
