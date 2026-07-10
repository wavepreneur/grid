"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/cms/admin-shell";
import { useStudioShell } from "@/components/cms/studio-shell-provider";

type Props = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  activePath: string;
};

export function StudioPage({ children, title, description, actions, activePath }: Props) {
  const { organizations, orgSlug } = useStudioShell();

  return (
    <AdminShell
      organizations={organizations}
      currentOrgSlug={orgSlug}
      title={title}
      description={description}
      actions={actions}
      activePath={activePath}
    >
      {children}
    </AdminShell>
  );
}
