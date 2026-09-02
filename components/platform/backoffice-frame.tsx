import { listOrganizations, getStudioOrganizationSlug } from "@/app/actions/cms/organizations";
import { StudioLayout } from "@/components/cms/studio-layout";
import { StudioShellProvider } from "@/components/cms/studio-shell-provider";

/** Shared GRID Backoffice chrome (sidebar + org switcher) for Studio, Cockpit and Data. */
export async function BackofficeFrame({ children }: { children: React.ReactNode }) {
  const [orgsResult, orgSlug] = await Promise.all([
    listOrganizations(),
    getStudioOrganizationSlug(),
  ]);

  return (
    <StudioShellProvider
      organizations={orgsResult.success ? orgsResult.data! : []}
      orgSlug={orgSlug}
    >
      <StudioLayout>{children}</StudioLayout>
    </StudioShellProvider>
  );
}
