import { StudioPage } from "@/components/cms/studio-page";
import { StudioProfileForm } from "@/components/cms/studio-profile-form";
import { getPortalProfilePublic } from "@/app/actions/portal-profile";

export default async function StudioSettingsPage() {
  const profile = await getPortalProfilePublic();

  return (
    <StudioPage
      eyebrow="Profil"
      title={`Hey ${profile.firstName}`}
      description="Name, Email und Passwort — das ist dein Zugang zu The GRID."
    >
      <StudioProfileForm name={profile.name} email={profile.email} />
    </StudioPage>
  );
}
