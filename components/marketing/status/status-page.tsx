import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GridLogo } from "@/components/marketing/grid-logo";
import { copy } from "@/components/marketing/landing/copy";
import { tellsMono, tellsSans } from "@/components/marketing/landing/fonts";
import { APP_HOME } from "@/lib/platform/app-paths";
import {
  STATUS_ENTRIES,
  STATUS_LEVELS,
  STATUS_SECTIONS,
  type StatusLevel,
} from "@/lib/marketing/status.config";
import "@/app/tells-landing.css";

const LEVEL_LABEL = Object.fromEntries(STATUS_LEVELS.map((level) => [level.status, level.label])) as Record<
  StatusLevel,
  string
>;

function StatusBadge({ status }: { status: StatusLevel }) {
  return <span className={`tl-status-badge is-${status}`}>{LEVEL_LABEL[status]}</span>;
}

export function StatusPage() {
  return (
    <div className={`tl ${tellsSans.variable} ${tellsMono.variable}`}>
      <header className="tl-nav is-scrolled">
        <div className="tl-nav-inner">
          <Link href={APP_HOME} className="tl-status-back">
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            <GridLogo height={22} />
            <span>Workspace</span>
          </Link>
        </div>
      </header>

      <main className="tl-status">
        <div className="tl-container">
          <h1 className="tl-h1">Status</h1>
          <p className="tl-body tl-status-lead">Internal. Not linked publicly.</p>

          <dl className="tl-status-legend">
            {STATUS_LEVELS.map((level) => (
              <div key={level.status}>
                <dt>
                  <StatusBadge status={level.status} />
                </dt>
                <dd className="tl-small">{level.meaning}</dd>
              </div>
            ))}
          </dl>

          {STATUS_SECTIONS.map((section) => {
            const entries = STATUS_ENTRIES.filter((entry) => entry.section === section.id);
            return (
              <section key={section.id} className="tl-status-section" aria-labelledby={`status-${section.id}`}>
                <header className="tl-status-head">
                  <h2 id={`status-${section.id}`} className="tl-h3">
                    <span className="tl-status-letter">{section.letter}</span>
                    {section.title}
                  </h2>
                  <p className="tl-small">{section.note}</p>
                </header>
                <ul className="tl-status-list">
                  {entries.map((entry) => (
                    <li key={entry.label}>
                      <span className="tl-status-label">
                        {entry.label}
                        {entry.note ? <em>{entry.note}</em> : null}
                      </span>
                      <StatusBadge status={entry.status} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      <footer className="tl-footer">
        <div className="tl-container">
          <GridLogo height={22} />
          <p className="tl-small">{copy.footer.tag}</p>
          <p className="tl-footer-legal">{copy.footer.legal}</p>
        </div>
      </footer>
    </div>
  );
}
