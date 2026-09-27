import { getPublicOrigin } from "@/lib/grid/booking-api";

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

export async function sendStudioHrRecapEmail(input: {
  to: string;
  teamName: string;
  score: number;
  resultsUrl: string;
  recapUrl: string;
  photoUrls?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const from = process.env.RESEND_FROM?.trim() || "Exitmania <hello@exitmania.com>";
  const photos = (input.photoUrls ?? [])
    .slice(0, 4)
    .map(
      (url) =>
        `<img src="${escapeHtml(url)}" alt="" width="160" style="border-radius:12px;margin:4px;" />`,
    )
    .join("");

  const html = `
    <p>Euer Team <strong>${escapeHtml(input.teamName)}</strong> ist fertig.</p>
    <p style="font-size:28px;font-weight:700;">${input.score} Punkte</p>
    ${photos ? `<p>${photos}</p>` : ""}
    <p>Bitte diese Auswertung an HR weiterleiten — zum Buchen oder um GRID in der Organisation zu testen.</p>
    <p><a href="${escapeHtml(input.resultsUrl)}" style="display:inline-block;background:#115e59;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600;">Auswertung öffnen</a></p>
    <p style="color:#64748b;font-size:13px;">Spieler-Recap (Link zum Speichern): <a href="${escapeHtml(input.recapUrl)}">${escapeHtml(input.recapUrl)}</a></p>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `${input.teamName}: Auswertung für HR`,
        html,
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
