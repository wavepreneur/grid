"use client";

/**
 * Soft recovery for /e/* — avoids a blank Vercel “couldn't load” dead-end
 * when a chunk or client render fails mid-session.
 */
export default function EventPlayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error.digest;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f7f6f0] px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
        Kurz unterbrochen
      </p>
      <h1 className="max-w-sm text-2xl font-bold text-[#111827]">
        Die Seite konnte nicht geladen werden
      </h1>
      <p className="max-w-sm text-base text-[#6b7280]">
        Tippe auf Neu laden — dein Team-Stand bleibt erhalten.
      </p>
      <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-2xl bg-[#0f766e] px-5 py-4 text-base font-bold text-white"
        >
          Neu laden
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          className="rounded-2xl border border-[#d1d5db] bg-white px-5 py-4 text-base font-bold text-[#111827]"
        >
          Seite komplett neu laden
        </button>
      </div>
    </div>
  );
}
