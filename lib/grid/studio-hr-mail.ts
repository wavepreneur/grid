import { getPublicOrigin } from "@/lib/grid/booking-api";
import {
  DEFAULT_HR_RECAP_EMAIL,
  flywheelKindForSurface,
  flywheelPageUrl,
  type FlywheelKind,
} from "@/lib/grid/flywheel";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mailOrigin(): string {
  const env = process.env.GRID_PUBLIC_ORIGIN?.replace(/\/$/, "");
  if (env) return env;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^https?:\/\//, "");
  if (production) return `https://${production}`;
  const preview = process.env.VERCEL_URL?.replace(/^https?:\/\//, "");
  if (preview) return `https://${preview}`;
  return getPublicOrigin();
}

export function studioHrMailOrigin(): string {
  return mailOrigin();
}

function buildFlywheelEmailHtml(input: {
  kind: FlywheelKind;
  teamName: string;
  score: number;
  pageUrl: string;
}): string {
  const teamevent = input.kind === "teamevent";
  const kicker = teamevent ? "Nächster Schritt · Teamevent" : "Nächster Schritt · GRID";
  const headline = teamevent
    ? "Euer Ergebnis — und wie ihr das mit der Firma spielt"
    : "Das Event ist durch — so bleibt das Spiel bei euch";
  const lead = teamevent
    ? `Team <strong>${escapeHtml(input.teamName)}</strong> ist fertig mit <strong>${input.score} Punkten</strong>. Die kurze Auswertung und der nächste Schritt für HR liegen auf einer Seite — zum Weiterleiten.`
    : `Team <strong>${escapeHtml(input.teamName)}</strong> ist fertig mit <strong>${input.score} Punkten</strong>. Für HR und Geschäftsleitung: wie GRID aus dem heutigen Event ein eigenes Firmen-Spiel macht.`;
  const cta = teamevent ? "Auswertung & Teamevent ansehen" : "GRID für die Organisation ansehen";

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
<tr>
<td style="padding:10px 16px;background-color:#f1f5f9;border-bottom:1px solid #e2e8f0;text-align:center;">
<p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">Darstellung fehlerhaft? <a href="${escapeHtml(input.pageUrl)}" style="color:#667eea;font-weight:600;">Online im Browser ansehen →</a></p>
</td>
</tr>
<tr><td style="background-color:#667eea;padding:36px 28px;text-align:center;">
<img src="https://exitmania.com/exitmania-logo-orange-optimized.png" alt="Exitmania" width="150" style="height:auto;display:block;margin:0 auto 10px;border:0;" />
<p style="margin:12px 0 0;color:#fff;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">${kicker}</p>
<h1 style="margin:10px 0 0;color:#fff;font-size:22px;line-height:1.35;">${headline}</h1>
</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${lead}</p>
<p style="margin:0 0 24px;text-align:center;">
<a href="${escapeHtml(input.pageUrl)}" style="display:inline-block;background-color:#667eea;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">${cta}</a>
</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;">Einmalige Auswertung, kein Newsletter.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export async function sendStudioHrRecapEmail(input: {
  to?: string;
  teamName: string;
  score: number;
  resultsUrl: string;
  recapUrl: string;
  surface?: string | null;
  photoUrls?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const to = (input.to?.trim() || DEFAULT_HR_RECAP_EMAIL).toLowerCase();
  const kind = flywheelKindForSurface(input.surface);
  const origin = mailOrigin();
  const pageUrl = flywheelPageUrl({
    kind,
    origin,
    teamName: input.teamName,
    score: input.score,
    resultsUrl: input.resultsUrl,
  });
  const from = process.env.RESEND_FROM?.trim() || "Exitmania <hello@exitmania.com>";
  const subject =
    kind === "teamevent"
      ? `${input.teamName}: euer Ergebnis — nächster Schritt fürs Team`
      : `${input.teamName}: fertig — so bleibt das Spiel bei euch`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: buildFlywheelEmailHtml({
          kind,
          teamName: input.teamName,
          score: input.score,
          pageUrl,
        }),
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: text.slice(0, 200) || `Resend ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Mail failed",
    };
  }
}
