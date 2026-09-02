import Link from "next/link";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import { MaturityBadge } from "@/components/marketing/maturity-badge";
import {
  cockpitTracker,
  goalTracker,
  gridStudioTracker,
  maturityLegend,
} from "@/lib/marketing/status-record";
import "@/app/grid-marketing.css";

function TrackerList({
  items,
}: {
  items: { claim: string; status: "live" | "beta" | "legacy" | "vision" }[];
}) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item, index) => (
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
            <span style={{ fontSize: 13, color: "rgba(240,244,255,0.85)" }}>{item.claim}</span>
            <MaturityBadge status={item.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GridStatusPage() {
  return (
    <div className="grid-marketing min-h-screen">
      <GridNav />
      <main>
        <section className="grid-section" style={{ paddingTop: 120 }}>
          <div className="grid-container">
            <span className="section-label">System of Record</span>
            <h1 className="grid-h2" style={{ fontSize: "clamp(28px, 4vw, 44px)", marginBottom: 16 }}>
              Engine status
              <br />
              <span style={{ color: "#00e5ff" }}>kept honest.</span>
            </h1>
            <p className="grid-body" style={{ maxWidth: 640, marginBottom: 28 }}>
              Internal compass for what ships, what is pilot, what is legacy, and what is still
              roadmap. The public pitch lives on the{" "}
              <Link href="/" className="grid-nav-link" style={{ textTransform: "none" }}>
                landing page
              </Link>
              .
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 40,
              }}
            >
              {maturityLegend.map((item) => (
                <div key={item.status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MaturityBadge status={item.status} />
                  <span style={{ fontSize: 12, color: "rgba(240,244,255,0.45)" }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(0,229,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                padding: "clamp(24px, 4vw, 40px)",
                marginBottom: 32,
              }}
            >
              <h2 className="grid-h2" style={{ fontSize: 22, marginBottom: 16 }}>
                Runtime
              </h2>
              <TrackerList items={goalTracker} />
            </div>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(0,229,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                padding: "clamp(24px, 4vw, 40px)",
                marginBottom: 32,
              }}
            >
              <h2 className="grid-h2" style={{ fontSize: 22, marginBottom: 16 }}>
                GRID Studio
              </h2>
              <TrackerList items={gridStudioTracker} />
            </div>

            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(167,139,250,0.18)",
                background: "rgba(0,0,0,0.35)",
                padding: "clamp(24px, 4vw, 40px)",
              }}
            >
              <h2 className="grid-h2" style={{ fontSize: 22, marginBottom: 16 }}>
                GRID Cockpit
              </h2>
              <TrackerList items={cockpitTracker} />
            </div>
          </div>
        </section>
      </main>
      <GridMarketingFooter />
    </div>
  );
}
