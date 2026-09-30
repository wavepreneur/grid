import { headers } from "next/headers";
import { localeLabel, type StudioLanguage } from "@/lib/cms/languages";
import type { TranslationUnit } from "@/lib/cms/game-i18n";

const GEMINI_MODELS = ["gemini-2.0-flash-exp", "gemini-2.0-flash"] as const;
const CHUNK_SIZE = 32;

const NATIVE_VOICE: Record<StudioLanguage, string> = {
  de: "Schreib natürliches Deutsch, wie man es im Spiel auf dem Handy liest — klar, lebendig, teamtauglich.",
  en: "Write natural British English a native speaker would actually say on a phone during a live team game. Spoken, clear, slightly playful. Not textbook, not corporate, not a word-for-word German calque. Address the team as “you”.",
  fr: "Écris un français de France naturel, comme le lirait un natif sur son téléphone pendant un jeu d’équipe en ville. Vivant, clair, légèrement ludique — pas de français scolaire, pas de calque de l’allemand. Tutoiement du groupe : vouvoie l’équipe avec « vous ».",
  es: "Escribe español de España natural, como lo leería un nativo en el móvil durante un juego de equipo. Claro, vivo, un poco juguetón — no de manual, no calcos del alemán. Habla al equipo de «vosotros».",
  it: "Scrivi italiano naturale da madrelingua, come si leggerebbe sul telefono durante un gioco di squadra in città. Chiaro, vivo, un po’ giocoso — niente italiano da libro, niente calchi dal tedesco. Rivolgiti al team con «voi».",
  nl: "Schrijf natuurlijk Nederlands (Nederland) zoals een native het op de telefoon tijdens een teamspel zou lezen. Helder, levendig, licht speels — geen schoolboek, geen Duitse calques. Spreek het team aan met «jullie».",
  pl: "Pisz naturalną polszczyzną, jak native speaker na telefonie w trakcie gry zespołowej. Żywo, jasno, lekko zabawowo — nie podręcznikowo, bez kalk z niemieckiego. Zwracaj się do drużyny na «wy».",
};

function apiKey(): string | null {
  const key = process.env.GOOGLE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

function parseJsonObject(raw: string): Record<string, string> {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Die Übersetzung kam nicht als JSON zurück.");
  }
  const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Die Übersetzung hatte kein gültiges JSON-Objekt.");
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

async function requestReferer(): Promise<string> {
  try {
    const incoming = await headers();
    const origin = incoming.get("origin");
    if (origin) return origin.replace(/\/$/, "") + "/";
    const referer = incoming.get("referer");
    if (referer) return new URL(referer).origin + "/";
  } catch {
    /* not in a request */
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}/`;
  return "http://localhost:3000/";
}

function geminiHttpError(status: number, detail: string): Error {
  if (status === 403 && /referer/i.test(detail)) {
    return new Error(
      "Gemini-Key ist auf Websites beschränkt. Im Google Cloud Console beim Key: Anwendungsbeschränkung auf „Keine“ stellen. HTTP-Referrer gilt nur im Browser, Studio ruft den Server auf.",
    );
  }
  if (status === 403) {
    return new Error("Gemini hat den Key abgelehnt (403). Generative Language API und Key-Rechte prüfen.");
  }
  return new Error(`Gemini ${status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
}

async function generateJson(model: string, key: string, prompt: string): Promise<Record<string, string>> {
  const referer = await requestReferer();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
        Referer: referer,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.45,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw geminiHttpError(response.status, detail);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(payload.error?.message || "Gemini hat keinen Text geliefert.");
  }
  return parseJsonObject(text);
}

function buildPrompt(input: {
  source: StudioLanguage;
  target: StudioLanguage;
  units: TranslationUnit[];
}): string {
  const payload = Object.fromEntries(input.units.map((unit) => [unit.key, unit.source]));
  return [
    `You are a native ${localeLabel(input.target)} copywriter for live team games (outdoor city games and indoor escapes).`,
    `Players read this on a phone while playing. It must sound like a native speaker wrote it — not a translation.`,
    "",
    NATIVE_VOICE[input.target],
    "",
    `Source language: ${localeLabel(input.source)}.`,
    `Target language: ${localeLabel(input.target)}.`,
    "",
    "Rules:",
    "- Keep the same meaning and energy. Informal German stays informal. A riddle stays a riddle — never explain the answer.",
    "- Keep proper nouns, city names, character names, brand names, codes, numbers, HTML/markdown, and punctuation.",
    "- Do not translate URLs. Do not add headings, notes, or extra sentences.",
    "- Return only a JSON object mapping each given key to the translated string. Same keys, no extras.",
    "",
    JSON.stringify(payload),
  ].join("\n");
}

export async function translateUnitsNative(input: {
  source: StudioLanguage;
  target: StudioLanguage;
  units: TranslationUnit[];
}): Promise<Record<string, string>> {
  const key = apiKey();
  if (!key) {
    throw new Error(
      "Kein Gemini-Key. In GRID GOOGLE_AI_API_KEY oder GEMINI_API_KEY setzen (lokal und auf Vercel).",
    );
  }
  if (input.units.length === 0) return {};

  const merged: Record<string, string> = {};
  let lastError: Error | null = null;

  for (let offset = 0; offset < input.units.length; offset += CHUNK_SIZE) {
    const chunk = input.units.slice(offset, offset + CHUNK_SIZE);
    const prompt = buildPrompt({ source: input.source, target: input.target, units: chunk });
    let done = false;
    for (const model of GEMINI_MODELS) {
      try {
        const part = await generateJson(model, key, prompt);
        for (const unit of chunk) {
          const value = part[unit.key];
          if (typeof value === "string" && value.trim()) merged[unit.key] = value.trim();
        }
        done = true;
        lastError = null;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Übersetzung fehlgeschlagen.");
      }
    }
    if (!done && lastError) throw lastError;
  }

  return merged;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(apiKey());
}
