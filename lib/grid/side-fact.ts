/**
 * CMS „Nach der Lösung“: field 1 = heading, field 2 = body.
 * Older snapshots concatenated „Good to know — …“ into the body; strip that.
 */

const FACT_SEP = " — ";

const KNOWN_HEADINGS = new Set([
  "gut zu wissen",
  "good to know",
  "wusstet ihr",
  "did you know",
  "notiert euch das",
  "hinweis",
]);

function normalizeHeading(value: string): string {
  return value
    .replace(/📍/g, "")
    .replace(/[^\w\sÄÖÜäöüß]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isFactHeadingPrefix(prefix: string, authoredTitle: string): boolean {
  const normalized = normalizeHeading(prefix);
  if (!normalized || normalized.length > 60) return false;
  if (authoredTitle && normalizeHeading(authoredTitle) === normalized) return true;
  return KNOWN_HEADINGS.has(normalized);
}

export function splitSideFact(
  title: string | undefined,
  body: string | undefined,
): { title: string; body: string } {
  const authoredTitle = title?.trim() ?? "";
  let text = body?.trim() ?? "";
  const at = text.indexOf(FACT_SEP);
  if (at > 0 && at <= 80) {
    const prefix = text.slice(0, at).trim();
    if (isFactHeadingPrefix(prefix, authoredTitle)) {
      text = text.slice(at + FACT_SEP.length).trim();
      return { title: authoredTitle || prefix, body: text };
    }
  }
  return { title: authoredTitle, body: text };
}

export function resolveQuizSideFact(
  title: string | undefined,
  body: string | undefined,
  fallbackTitle: string,
): { title: string; body: string } | null {
  const split = splitSideFact(title, body);
  if (!split.title && !split.body) return null;
  return {
    title: split.title || fallbackTitle,
    body: split.body,
  };
}
