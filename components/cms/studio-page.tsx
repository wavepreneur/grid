import type { ReactNode } from "react";
import {
  getStudioOrganizationSlug,
  listOrganizations,
} from "@/app/actions/cms/organizations";
import { AdminShell } from "@/components/cms/admin-shell";

type Props = {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  activePath: string;
};

export async function StudioPage({
  children,
  title,
  description,
  actions,
  activePath,
}: Props) {
  const [orgsResult, orgSlug] = await Promise.all([
    listOrganizations(),
    getStudioOrganizationSlug(),
  ]);

  const organizations = orgsResult.success ? orgsResult.data! : [];

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
