import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/marketing/landing/contact-form";
import { ExitmaniaBanner } from "@/components/marketing/landing/exitmania-banner";
import { LogoStrip } from "@/components/marketing/landing/logo-strip";
import { copy, LINKS } from "@/components/marketing/landing/copy";
import { tellsMono, tellsSans } from "@/components/marketing/landing/fonts";
import { LandingFooter } from "@/components/marketing/landing/footer";
import { HowItWorks } from "@/components/marketing/landing/how-it-works";
import { Insights } from "@/components/marketing/landing/insights";
import { LandingNav } from "@/components/marketing/landing/nav";
import { Pricing } from "@/components/marketing/landing/pricing";
import { ReportPreview } from "@/components/marketing/landing/report-preview";
import "@/app/tells-landing.css";

export function TellsLandingPage() {
  const { hero, proof, problem, how, insights, statement, privacy, pricing, faq, close, contact } = copy;

  return (
    <div className={`tl ${tellsSans.variable} ${tellsMono.variable}`}>
      <LandingNav />
      <ExitmaniaBanner />

      <main>
        <section className="tl-hero" aria-labelledby="tl-hero-title">
          <div className="tl-container">
            <div className="tl-hero-copy">
              <h1 id="tl-hero-title" className="tl-display">
                <span>{hero.title[0]}</span>
                <span className="tl-display-accent">{hero.title[1]}</span>
              </h1>
              <p className="tl-body-lg tl-hero-lead">{hero.lead}</p>
              <div className="tl-actions">
                <Link href={LINKS.contact} className="tl-btn tl-btn-primary">
                  {hero.primary}
                </Link>
                <Link href={LINKS.report} className="tl-btn tl-btn-secondary">
                  {hero.secondary}
                </Link>
              </div>
              <ul className="tl-hero-facts">
                {hero.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="tl-container tl-hero-visual">
            <Link href={LINKS.report} className="tl-hero-link" aria-label={hero.secondary}>
              <ReportPreview />
            </Link>
            <a href={LINKS.playFirst} className="tl-link tl-hero-play" target="_blank" rel="noopener noreferrer">
              {hero.playFirst}
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
            </a>
          </div>
        </section>

        <section className="tl-proof" aria-label={proof.label}>
          <div className="tl-container tl-proof-inner">
            <p className="tl-small">{proof.label}</p>
            <ul>
              {proof.items.map((item) => (
                <li key={item.label}>
                  <b>{item.value}</b> {item.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <LogoStrip />

        <section className="tl-section" aria-labelledby="tl-problem-title">
          <div className="tl-container tl-split">
            <h2 id="tl-problem-title" className="tl-h1 tl-split-left">
              {problem.title}
            </h2>
            <div className="tl-split-right">
              <dl className="tl-rows">
                {problem.rows.map((row) => (
                  <div key={row.name} className="tl-row">
                    <dt>{row.name}</dt>
                    <dd>{row.text}</dd>
                  </div>
                ))}
              </dl>
              <p className="tl-body-lg tl-problem-close">{problem.close}</p>
            </div>
          </div>
        </section>

        <section id="how" className="tl-section tl-section-sunken" aria-labelledby="tl-how-title">
          <div className="tl-container">
            <header className="tl-head">
              <h2 id="tl-how-title" className="tl-h1">
                {how.title}
              </h2>
              <p className="tl-body-lg">{how.lead}</p>
            </header>
            <HowItWorks />
          </div>
        </section>

        <section id="report" className="tl-section" aria-labelledby="tl-report-title">
          <div className="tl-container">
            <header className="tl-head tl-head-row">
              <div>
                <h2 id="tl-report-title" className="tl-h1">
                  {insights.title}
                </h2>
                <p className="tl-body-lg">{insights.lead}</p>
              </div>
              <Link href={LINKS.report} className="tl-link">
                {hero.secondary}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </Link>
            </header>
            <Insights />
          </div>
        </section>

        <section className="tl-dark" aria-labelledby="tl-statement">
          <div className="tl-container tl-split">
            <div className="tl-split-left">
              <p className="tl-dark-kicker">{statement.kicker}</p>
              <p className="tl-body-lg">{statement.text}</p>
            </div>
            <p id="tl-statement" className="tl-dark-line tl-split-right">
              <span>{statement.line[0]}</span>
              <span>{statement.line[1]}</span>
            </p>
          </div>
        </section>

        <section className="tl-section" aria-labelledby="tl-privacy-title">
          <div className="tl-container tl-split">
            <div className="tl-split-left">
              <h2 id="tl-privacy-title" className="tl-h1">
                {privacy.title}
              </h2>
              <p className="tl-body-lg">{privacy.lead}</p>
            </div>
            <div className="tl-split-right">
              <ul className="tl-rows tl-rows-plain">
                {privacy.points.map((point) => (
                  <li key={point} className="tl-row">
                    {point}
                  </li>
                ))}
              </ul>
              <Link href={LINKS.contact} className="tl-link tl-privacy-link">
                {privacy.link}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section id="pricing" className="tl-section tl-section-sunken" aria-labelledby="tl-pricing-title">
          <div className="tl-container">
            <header className="tl-head">
              <h2 id="tl-pricing-title" className="tl-h1">
                {pricing.title}
              </h2>
              <p className="tl-body-lg">{pricing.lead}</p>
            </header>
            <Pricing />
          </div>
        </section>

        <section id="faq" className="tl-section" aria-labelledby="tl-faq-title">
          <div className="tl-container">
            <header className="tl-head">
              <h2 id="tl-faq-title" className="tl-h1">
                {faq.title}
              </h2>
            </header>
            <dl className="tl-faq">
              {faq.items.map((item) => (
                <div key={item.q} className="tl-faq-row">
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="contact" className="tl-section tl-contact" aria-labelledby="tl-contact-title">
          <div className="tl-container tl-split">
            <div className="tl-split-left">
              <h2 id="tl-contact-title" className="tl-h1">
                {close.title}
              </h2>
              <p className="tl-body-lg">{contact.lead}</p>
              <Link href={LINKS.report} className="tl-link">
                {close.secondary}
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
            <div className="tl-split-right">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
