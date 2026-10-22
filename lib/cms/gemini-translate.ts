import { localeLabel, type StudioLanguage } from "@/lib/cms/languages";
import type { TranslationUnit } from "@/lib/cms/game-i18n";

/** Prefer fast Flash without multi-model retries (dead 2.x IDs 404). */
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"] as const;
const CHUNK_SIZE = 12;
const REQUEST_TIMEOUT_MS = 35_000;
const JOB_TIMEOUT_MS = 90_000;
const DEFAULT_REFERER = "https://www.exitmania.com/";

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

function allowedReferer(): string {
  const configured = process.env.GEMINI_HTTP_REFERER?.trim();
  if (configured) return configured.endsWith("/") ? configured : `${configured}/`;
  return DEFAULT_REFERER;
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

function geminiHttpError(status: number, detail: string): Error {
  if (status === 403 && /referer/i.test(detail)) {
    return new Error(
      "Gemini-Key ist auf Websites beschränkt. Dieser Key akzeptiert www.exitmania.com. In der Cloud Console denselben Key öffnen und speichern, oder GEMINI_HTTP_REFERER auf die erlaubte URL setzen.",
    );
  }
  if (status === 403) {
    return new Error("Gemini hat den Key abgelehnt (403). Generative Language API und Key-Rechte prüfen.");
  }
  return new Error(`Gemini ${status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
}

async function postGemini(
  model: string,
  key: string,
  body: string,
  signal: AbortSignal,
): Promise<{ status: number; text: string }> {
  const referer = allowedReferer();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
        Referer: referer,
      },
      body,
      signal,
    },
  );
  const text = await response.text();
  return { status: response.status, text };
}

async function generateJson(
  model: string,
  key: string,
  prompt: string,
  parentSignal: AbortSignal,
): Promise<Record<string, string>> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      responseMimeType: "application/json",
      // Flash aliases may think by default; budget 0 keeps Studio snappy.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  parentSignal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await postGemini(model, key, body, controller.signal);
    if (response.status < 200 || response.status >= 300) {
      throw geminiHttpError(response.status, response.text);
    }
    const payload = JSON.parse(response.text) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(payload.error?.message || "Gemini hat keinen Text geliefert.");
    }
    return parseJsonObject(text);
  } catch (error) {
    if (controller.signal.aborted && !parentSignal.aborted) {
      throw new Error(
        `Gemini-Timeout (${Math.round(REQUEST_TIMEOUT_MS / 1000)}s) bei ${model}. Bitte erneut versuchen.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener("abort", onAbort);
  }
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
    "- Keep every emoji exactly, in the same place.",
    "- Keep line breaks, blank lines, and paragraph structure exactly. Do not collapse the text into one block.",
    "- Keep the same capitalization: ALL CAPS stays ALL CAPS, Title Case stays Title Case, mixed case stays mixed.",
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
      "Kein Gemini-Key. Lokal und auf Vercel GOOGLE_AI_API_KEY oder GEMINI_API_KEY setzen.",
    );
  }
  if (input.units.length === 0) return {};

  const merged: Record<string, string> = {};
  let lastError: Error | null = null;
  const job = new AbortController();
  const jobTimer = setTimeout(() => job.abort(), JOB_TIMEOUT_MS);

  try {
    for (let offset = 0; offset < input.units.length; offset += CHUNK_SIZE) {
      if (job.signal.aborted) {
        if (Object.keys(merged).length > 0) return merged;
        throw new Error(
          `Übersetzung abgebrochen nach ${Math.round(JOB_TIMEOUT_MS / 1000)}s. Bitte erneut klicken — fertige Felder bleiben.`,
        );
      }
      const chunk = input.units.slice(offset, offset + CHUNK_SIZE);
      const prompt = buildPrompt({ source: input.source, target: input.target, units: chunk });
      let done = false;
      for (const model of GEMINI_MODELS) {
        try {
          const part = await generateJson(model, key, prompt, job.signal);
          for (const unit of chunk) {
            const value = part[unit.key];
            if (typeof value === "string" && value.trim()) merged[unit.key] = value;
          }
          done = true;
          lastError = null;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Übersetzung fehlgeschlagen.");
          if (job.signal.aborted) break;
        }
      }
      if (!done && lastError) {
        if (Object.keys(merged).length > 0) return merged;
        throw lastError;
      }
    }
  } finally {
    clearTimeout(jobTimer);
  }

  return merged;
}

export function hasGeminiApiKey(): boolean {
  return Boolean(apiKey());
}
