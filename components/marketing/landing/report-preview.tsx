import { copy, EXAMPLE } from "@/components/marketing/landing/copy";
import { Signal } from "@/components/marketing/landing/signal";

const t = copy.preview;
const WEAKEST = "T4";

/** The HR report inside an app window. Static markup; the entrance is CSS only. */
export function ReportPreview() {
  return (
    <div className="tl-app" role="img" aria-label={`${t.crumbs[1]} report. ${t.verdict}`}>
      <div className="tl-app-bar" aria-hidden>
        <p className="tl-app-crumbs">
          <span className="tl-app-mark" />
          <span>{t.crumbs[0]}</span>
          <span className="tl-app-sep">/</span>
          <strong>{t.crumbs[1]}</strong>
        </p>
        <p className="tl-app-actions">
          <span className="tl-app-btn">{t.actions[0]}</span>
          <span className="tl-app-btn is-primary">{t.actions[1]}</span>
        </p>
      </div>

      <div className="tl-app-body" aria-hidden>
        <section className="tl-rp-summary">
          <p className="tl-rp-meta">{t.meta}</p>
          <div className="tl-rp-score">
            <p className="tl-rp-score-value">{EXAMPLE.score}</p>
            <div>
              <p className="tl-rp-score-label">{t.scoreLabel}</p>
              <p className="tl-rp-score-bench">{t.scoreScale}</p>
            </div>
          </div>
          <p className="tl-rp-verdict">{t.verdict}</p>

          <p className="tl-rp-heading">{t.findingsTitle}</p>
          <ol className="tl-rp-findings">
            {t.findings.map((finding, index) => (
              <li key={finding.what} className={index === 0 ? "is-signal" : undefined}>
                <span className="tl-rp-finding-n">
                  {index === 0 ? <Signal size={14} className="tl-signal-pop" /> : index + 1}
                </span>
                <div>
                  <p className="tl-rp-finding-what">{finding.what}</p>
                  <p className="tl-rp-finding-next">
                    <span>{t.nextLabel}</span> {finding.next}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="tl-rp-side">
          <div className="tl-rp-block">
            <p className="tl-rp-heading">{t.tasksTitle}</p>
            <ul className="tl-rp-tasks">
              {t.tasks.map((task, index) => (
                <li key={task.id} className={task.id === WEAKEST ? "is-signal" : undefined}>
                  <span className="tl-rp-task-name">
                    <b>{task.id}</b> {task.title}
                  </span>
                  <span className="tl-rp-track">
                    <i style={{ width: `${task.value}%`, animationDelay: `${300 + index * 30}ms` }} />
                  </span>
                  <span className="tl-rp-task-value">{task.value}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="tl-rp-block">
            <p className="tl-rp-heading">{t.teamsTitle}</p>
            <ol className="tl-rp-teams">
              {t.teams.map((team) => (
                <li key={team.name}>
                  <span>{team.name}</span>
                  <span className="tl-rp-teams-bar">
                    <i style={{ width: `${team.score}%` }} />
                  </span>
                  <b>{team.score}</b>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <p className="tl-app-foot" aria-hidden>
        {t.privacy}
      </p>
    </div>
  );
}
