import type { Metadata } from "next";
import { listOrganizations, getStudioOrganizationSlug } from "@/app/actions/cms/organizations";
import { StudioShellProvider } from "@/components/cms/studio-shell-provider";
import { QueryProvider } from "@/components/platform/query-provider";

export const metadata: Metadata = {
  title: "GRID Studio | CMS",
  description: "Content management for the GRID asymmetric team dynamics engine.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [orgsResult, orgSlug] = await Promise.all([
    listOrganizations(),
    getStudioOrganizationSlug(),
  ]);

  return (
    <QueryProvider>
      <StudioShellProvider
        organizations={orgsResult.success ? orgsResult.data! : []}
        orgSlug={orgSlug}
      >
        {children}
      </StudioShellProvider>
    </QueryProvider>
  );
}
