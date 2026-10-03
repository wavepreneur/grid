import { listOrganizations, getStudioOrganizationSlug } from "@/app/actions/cms/organizations";
import { getPortalProfilePublic } from "@/app/actions/portal-profile";
import { StudioOverviewSection } from "@/components/cms/studio-overview-section";
import { StudioPage } from "@/components/cms/studio-page";

export default async function AppHomePage() {
  const [profile, orgsResult, orgSlug] = await Promise.all([
    getPortalProfilePublic(),
    listOrganizations(),
    getStudioOrganizationSlug(),
  ]);

  const project = orgsResult.success
    ? orgsResult.data?.find((org) => org.slug === orgSlug)
    : undefined;
  const projectName = project?.name ?? orgSlug;

  return (
    <StudioPage
      eyebrow={projectName}
      title={`Willkommen zurück, ${profile.firstName}`}
      description={`${projectName} — Zutaten sammeln, ein Spiel kochen, dann unter Rezepte teilen und mit Städten kombinieren.`}
    >
      <StudioOverviewSection />
    </StudioPage>
  );
}
