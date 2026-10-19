import { existsSync } from "node:fs";
import path from "node:path";
import { copy } from "@/components/marketing/landing/copy";
import { CUSTOMER_LOGOS } from "@/components/marketing/landing/logos";

const DEV = process.env.NODE_ENV === "development";

export function LogoStrip() {
  const logos = CUSTOMER_LOGOS.map((logo) => ({
    ...logo,
    ready: existsSync(path.join(process.cwd(), "public", logo.src)),
  })).filter((logo) => logo.ready || DEV);

  if (logos.length === 0) return null;

  return (
    <section className="tl-logos" aria-labelledby="tl-logos-title">
      <div className="tl-container">
        <h2 id="tl-logos-title" className="tl-logos-title">
          {copy.logos.title}
        </h2>
        <ul className="tl-logos-row">
          {logos.map((logo) => (
            <li key={logo.name} className="tl-logo">
              {logo.ready ? (
                // eslint-disable-next-line @next/next/no-img-element -- SVG logos, no optimisation needed
                <img
                  src={logo.src}
                  alt={logo.name}
                  style={{ height: logo.height }}
                />
              ) : (
                <span className="tl-logo-missing">{logo.name} · missing file</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
