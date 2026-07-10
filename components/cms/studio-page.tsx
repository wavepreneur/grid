"use client";

import type { ReactNode } from "react";
import { StudioMobileNav } from "@/components/cms/studio-layout";

type Props = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function StudioPage({ children, title, description, actions }: Props) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        <StudioMobileNav />
      </header>

      <main className="studio-main flex-1 px-6 py-8 lg:px-10">{children}</main>
    </>
  );
}
