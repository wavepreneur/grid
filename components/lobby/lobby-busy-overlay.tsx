"use client";

type LobbyBusyOverlayProps = {
  title: string;
  subtitle?: string;
};

/**
 * Full-screen wait state for lobby actions that can take a few seconds
 * (start, lead transfer). Shown immediately on tap — never leave players
 * staring at a frozen button outdoors.
 */
export function LobbyBusyOverlay({ title, subtitle }: LobbyBusyOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white px-6 py-8 text-center shadow-xl">
        <div
          className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-teal-600"
          aria-hidden
        />
        <h2 className="mt-5 text-xl font-bold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
        ) : null}
        <div
          className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={title}
        >
          <div className="cg-animate-busy-slide h-full w-1/2 rounded-full bg-teal-600" />
        </div>
        <p className="mt-4 text-xs font-medium text-slate-400">
          Bitte kurz warten — das Team wird synchronisiert.
        </p>
      </div>
    </div>
  );
}
