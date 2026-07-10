import type { ReactNode } from "react";

type GameShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function GameShell({ title, description, children }: GameShellProps) {
  return (
    <div className="grid-bg min-h-screen px-3 py-6 sm:px-4 sm:py-8">
      <main className="mx-auto w-full max-w-6xl min-w-0">
        <header className="mb-5 flex flex-col gap-2 px-1 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
            GRID Mission
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-6 text-slate-500 sm:leading-7">{description}</p>
          ) : null}
        </header>
        <div className="min-w-0 overflow-x-clip rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
