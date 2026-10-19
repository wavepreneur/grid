import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { copy, LINKS } from "@/components/marketing/landing/copy";

const RECOMMENDED = 1;

export function Pricing() {
  const s = copy.pricing.session;
  const y = copy.pricing.yearly;

  return (
    <div className="tl-pricing">
      <article className="tl-session">
        <div className="tl-session-main">
          <h3 className="tl-h3">{s.name}</h3>
          <p className="tl-body">{s.text}</p>
          <ul className="tl-session-includes">
            {s.includes.map((item) => (
              <li key={item}>
                <Check size={16} strokeWidth={1.5} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="tl-session-buy">
          <p className="tl-price">
            <span className="tl-price-value">{s.price}</span>
            <span className="tl-price-unit">{s.unit}</span>
          </p>
          <p className="tl-small">{s.setup}</p>
          <p className="tl-small">{s.scope}</p>
          <p className="tl-session-credit">{s.exitmania}</p>
          <Link href={LINKS.contact} className="tl-btn tl-btn-primary">
            {s.cta}
          </Link>
        </div>
      </article>

      <div className="tl-yearly">
        <div className="tl-yearly-head">
          <h3 className="tl-h3">{y.title}</h3>
          <p className="tl-small">{y.lead}</p>
        </div>
        <div className="tl-table-wrap">
          <table className="tl-table">
            <thead>
              <tr>
                <td />
                {y.plans.map((plan, index) => (
                  <th key={plan} scope="col" className={index === RECOMMENDED ? "is-recommended" : undefined}>
                    <span className="tl-plan-name">{plan}</span>
                    {index === RECOMMENDED ? <span className="tl-plan-tag">{y.recommended}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {y.rows.map((row) => (
                <tr key={row.label} className={"kind" in row && row.kind === "price" ? "is-price" : undefined}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={index} className={index === RECOMMENDED ? "is-recommended" : undefined}>
                      {value === true ? (
                        <Check size={16} strokeWidth={1.5} aria-label="Included" className="tl-yes" />
                      ) : value === false ? (
                        <Minus size={16} strokeWidth={1.5} aria-label="Not included" className="tl-no" />
                      ) : "kind" in row && row.kind === "price" ? (
                        <span className="tl-table-price">
                          {index === row.values.length - 1 ? <small>{y.from} </small> : null}
                          {value}
                          <small> {y.perMonth}</small>
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="is-cta">
                <td />
                {y.cta.map((label, index) => (
                  <td key={label} className={index === RECOMMENDED ? "is-recommended" : undefined}>
                    <Link
                      href={LINKS.contact}
                      className={`tl-btn tl-btn-sm ${index === RECOMMENDED ? "tl-btn-primary" : "tl-btn-secondary"}`}
                    >
                      {label}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="tl-notes">
          {y.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
