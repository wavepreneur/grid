import { timingSafeEqual } from "node:crypto";

export function passwordsMatch(input: string): boolean {
  const expected = process.env.TELLS_GATE_PASSWORD ?? "";
  const a = Buffer.from(input.normalize("NFKC"));
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length) {
    const dummy = Buffer.alloc(32);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(a, b);
}
