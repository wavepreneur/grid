"use server";

import { DEFAULT_HR_RECAP_EMAIL } from "@/lib/grid/flywheel";
import type { ActionResult } from "@/lib/grid/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitGridDemoRequest(input: {
  name: string;
  email: string;
  company: string;
  note?: string;
}): Promise<ActionResult<{ sent: true }>> {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase();
  const company = input.company.trim().slice(0, 120);
  const note = (input.note ?? "").trim().slice(0, 800);
  if (!name || !company || !EMAIL_RE.test(email)) {
    return { success: false, error: "Bitte Name, Firma und eine gültige E-Mail angeben." };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { success: false, error: "Anfrage gerade nicht möglich. Bitte später nochmal." };
  }

  const from = process.env.RESEND_FROM?.trim() || "GRID <hello@exitmania.com>";
  const html = `
    <p><strong>GRID Demo-Anfrage</strong></p>
    <p>${name} · ${company}<br/>${email}</p>
    ${note ? `<p>${note.replace(/</g, "&lt;")}</p>` : ""}
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
        to: [DEFAULT_HR_RECAP_EMAIL],
        reply_to: email,
        subject: `GRID Demo: ${company}`,
        html,
      }),
    });
    if (!response.ok) {
      return { success: false, error: "Anfrage gerade nicht möglich. Bitte später nochmal." };
    }
    return { success: true, data: { sent: true } };
  } catch {
    return { success: false, error: "Anfrage gerade nicht möglich. Bitte später nochmal." };
  }
}
