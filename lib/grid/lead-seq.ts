/** Shared monotonic clock for lead transfer — last tap wins across devices. */

let lastSeq = 0;

export function nextLeadSeq(): number {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
}

export function noteLeadSeq(seq: number): void {
  if (Number.isFinite(seq) && seq > lastSeq) {
    lastSeq = seq;
  }
}

export function parseLeadSeq(value: unknown): number {
  const seq = Number(value);
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}
