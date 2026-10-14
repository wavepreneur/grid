import Link from "next/link";
import { ClipboardList, Presentation, Camera, Users, GraduationCap, Rocket, Combine, Crown } from "lucide-react";
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
    title: "Surveys",
    text: "People answer how they think they should. You get opinions, not behavior.",
    icon: ClipboardList,
  },
  {
    title: "Workshops",
    text: "One facilitator, twelve people, a flipchart. Impressions, not data. And it doesn’t scale to a thousand.",
    icon: Presentation,
  },
  {
    title: "Team events",
    text: "Fun for two hours. Then a photo. Nothing changes on Monday.",
    icon: Camera,
  },
];

const uses = [
  {
    title: "Onboarding",
    text: "Know whether new hires actually understood, not just attended.",
    icon: Users,
  },
  {
    title: "Training validation",
    text: "Replace the quiz at the end with proof of understanding.",
    icon: GraduationCap,
  },
  {
    title: "Kickoffs & all-hands",
    text: "Fifty thousand people, one link, real data on how teams work.",
    icon: Rocket,
  },
  {
    title: "Post-merger & reorgs",
    text: "See how new teams really work together, from day one.",
    icon: Combine,
  },
  {
    title: "Leadership programs",
    text: "Show teams their patterns, not your opinion of them.",
    icon: Crown,
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
            justifyContent: "flex-start",
            padding: "96px 24px 40px",
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
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1040, width: "100%" }}>
            <p className="section-label" style={{ letterSpacing: "0.28em", marginBottom: 18 }}>
              Play-based team intelligence
            </p>
            <h1
              className="grid-h1"
              style={{
                marginBottom: 20,
                maxWidth: 920,
                marginInline: "auto",
                fontSize: "clamp(32px, 5vw, 58px)",
                lineHeight: 1.05,
              }}
            >
              <span style={{ display: "block" }}>Don’t ask your team.</span>
              <span style={{ display: "block", color: "var(--grid-cyan)" }}>Let it tell.</span>
            </h1>
            <p
              className="grid-body"
              style={{
                fontSize: "clamp(16px, 2.1vw, 21px)",
                maxWidth: 680,
                lineHeight: 1.5,
                margin: "0 auto 20px",
                fontWeight: 600,
                opacity: 0.78,
              }}
            >
              Surveys hear what people say. Tells sees what teams do. Your team plays for 30 minutes
              and you see where it gets stuck, how roles really work and whether the topic landed.
            </p>

            <div className="grid-hero-cta-row">
              <Link href="#access" className="grid-cta">
                Run a session with your team
              </Link>
              <Link href="#see" className="grid-cta-outline">
                See a sample report
              </Link>
            </div>
            <ul className="grid-hero-trust">
              <li>Starts in 60 seconds</li>
              <li>Any device</li>
              <li>No app, no login</li>
              <li>2 to 50,000 people</li>
            </ul>
            <GridHeroLive />
          </div>
        </section>

        <p className="grid-proof-bar">
          Built on <strong>14 years</strong> of team building games. <strong>Exitmania</strong> runs on Tells.
        </p>

        <section id="problem" className="grid-section" style={{ background: "var(--grid-bg-elevated)" }}>
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 920, marginInline: "auto" }}>
                <span className="section-label">The problem</span>
                <h2 className="grid-h2 grid-headline-pair">
                  <span>You measure your teams with words.</span>
                  <span className="is-accent">Teams don’t work with words.</span>
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
              <p className="grid-body" style={{ marginTop: 36, textAlign: "center", maxWidth: 520, marginInline: "auto" }}>
                Every method asks. None of them watches.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="shift" className="grid-section grid-shift">
          <div className="grid-container" style={{ maxWidth: 860, textAlign: "center" }}>
            <GridReveal>
              <h2 className="grid-shift-line">
                Teams show.
                <br />
                <span>Tells tells.</span>
              </h2>
            </GridReveal>
            <GridReveal delay={120}>
              <p className="grid-body" style={{ marginTop: 28, maxWidth: 640, marginInline: "auto" }}>
                Under light pressure, teams stop performing and start behaving. Who waits. Who decides.
                Where information gets lost. Which task nobody really understood.
              </p>
              <p className="grid-body" style={{ marginTop: 16, maxWidth: 640, marginInline: "auto" }}>
                Tells turns every click, every wrong answer and every second of waiting into a signal
                — and every signal into a clear answer.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="how" className="grid-section grid-section-grid-bg">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 740, marginInline: "auto" }}>
                <span className="section-label">How it works</span>
                <h2 className="grid-h2">
                  Content in. Insight out.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>Nothing in between.</span>
                </h2>
              </div>
            </GridReveal>
            <GridReveal delay={80}>
              <GridHowItWorks />
            </GridReveal>
            <GridReveal delay={160}>
              <p className="grid-body" style={{ marginTop: 32, textAlign: "center", maxWidth: 560, marginInline: "auto" }}>
                No host. No facilitator. No IT ticket. If you can send an email, you can run Tells.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="see" className="grid-section grid-benefits-section">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 820, marginInline: "auto" }}>
                <h2 className="grid-h2" style={{ fontSize: "clamp(32px, 4.6vw, 52px)" }}>
                  What no host could ever see.
                </h2>
              </div>
            </GridReveal>
            <GridBenefits />
            <div className="grid-show-cta">
              <Link href="#access" className="grid-cta">
                Run a session with your team
              </Link>
            </div>
            <div className="grid-logo-row-wrap">
              <p className="grid-logo-row-kicker">Already on Exitmania</p>
              <ul className="grid-logo-row">
                <li>Siemens</li>
                <li>Bosch</li>
                <li>Allianz</li>
                <li>SAP</li>
                <li>BMW</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="why" className="grid-section grid-aha">
          <div className="grid-container" style={{ maxWidth: 760, textAlign: "center" }}>
            <GridReveal>
              <h2 className="grid-aha-kicker">Every team has tells.</h2>
              <p className="grid-body" style={{ marginBottom: 16 }}>
                In poker, a tell is the small signal that gives away what’s really going on: a pause,
                a glance, a hesitation. Teams have them too. In how they split work, how long they wait,
                where they go wrong.
              </p>
              <p className="grid-body" style={{ marginBottom: 28 }}>
                We built a platform to read them.
              </p>
              <p className="grid-aha-line">
                Tell me how you play.
                <br />
                I’ll tell you how you work.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="formats" className="grid-section" style={{ background: "var(--grid-bg-elevated)" }}>
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 720, marginInline: "auto" }}>
                <span className="section-label">Formats</span>
                <h2 className="grid-h2">
                  10 minutes or 2 hours.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>Two people or fifty thousand.</span>
                </h2>
              </div>
            </GridReveal>
            <div className="grid-try-surfaces" style={{ maxWidth: 920, margin: "0 auto" }}>
              <article className="grid-try-surface">
                <strong>Online</strong>
                <span>Remote and hybrid teams, anywhere</span>
              </article>
              <article className="grid-try-surface">
                <strong>Indoor</strong>
                <span>Offices, kickoffs, conferences</span>
              </article>
              <article className="grid-try-surface">
                <strong>Outdoor</strong>
                <span>City games in 1,900+ cities</span>
              </article>
            </div>
            <GridReveal delay={120}>
              <p className="grid-body" style={{ marginTop: 28, textAlign: "center" }}>
                Any language. Any device. Every team starts at the same second.
              </p>
            </GridReveal>
          </div>
        </section>

        <section id="use" className="grid-section grid-section-grid-bg">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 720, marginInline: "auto" }}>
                <span className="section-label">Use cases</span>
                <h2 className="grid-h2">
                  Built for the moments
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>that matter.</span>
                </h2>
              </div>
            </GridReveal>
            <div className="grid-use-grid">
              {uses.map((item, index) => {
                const Icon = item.icon;
                return (
                  <GridReveal key={item.title} delay={index * 70}>
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
          </div>
        </section>

        <section id="privacy" className="grid-section">
          <div className="grid-container" style={{ maxWidth: 760, textAlign: "center" }}>
            <GridReveal>
              <span className="section-label">Privacy</span>
              <h2 className="grid-h2" style={{ marginBottom: 24 }}>
                Insight on teams.
                <br />
                <span style={{ color: "var(--grid-cyan)" }}>Never on people.</span>
              </h2>
              <ul className="grid-privacy-list">
                <li>Team-level only: no individual scores, no personal profiles</li>
                <li>Minimum group size: results appear only for groups of 5 or more</li>
                <li>GDPR-compliant</li>
              </ul>
              <p className="grid-body" style={{ marginTop: 28 }}>
                Your people play. Nobody gets graded.
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
                  <span style={{ color: "var(--grid-cyan)" }}>on Tells.</span>
                </h2>
                <p className="grid-body">
                  50,000+ players in city games, indoors and online, booked and started in seconds.
                  Same engine. Same speed. Now pointed at your team.
                </p>
                <p className="grid-try-price">
                  From <strong>€9.90</strong> per person
                  <span>1,900+ cities · start after booking</span>
                </p>
                <div className="grid-hero-cta-row">
                  <Link href="#access" className="grid-cta">
                    Run a session with your team
                  </Link>
                  <a
                    href="https://exitmania.com"
                    className="grid-text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Play a session
                  </a>
                </div>
              </div>
            </GridReveal>
          </div>
        </section>

        <section id="pricing" className="grid-section grid-section-grid-bg">
          <div className="grid-container">
            <GridReveal>
              <div style={{ textAlign: "center", marginBottom: 28, maxWidth: 720, marginInline: "auto" }}>
                <span className="section-label">Pricing</span>
                <h2 className="grid-h2">
                  Try a live session first.
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>Then decide.</span>
                </h2>
                <p className="grid-body" style={{ marginTop: 16 }}>
                  Pay monthly or save 20% yearly.
                </p>
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
                <span className="section-label">FAQ</span>
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
                <span className="section-label">Your team already has tells</span>
                <h2 className="grid-h2" style={{ marginBottom: 16 }}>
                  Find out
                  <br />
                  <span style={{ color: "var(--grid-cyan)" }}>what they say.</span>
                </h2>
                <p className="grid-body" style={{ maxWidth: 560, margin: "0 auto" }}>
                  We set up your first session within 24 hours.
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
