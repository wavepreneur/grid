"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Small uppercase label above the title (Lovable pattern). */
  eyebrow?: string;
};

export function StudioPage({
  children,
  title,
  description,
  actions,
  eyebrow = "GRID Studio",
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 sm:mb-7">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <main className="studio-main min-w-0 flex-1 space-y-6">{children}</main>
    </div>
  );
}
