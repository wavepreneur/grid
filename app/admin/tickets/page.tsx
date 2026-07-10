import { StudioPage } from "@/components/cms/studio-page";
import { StudioTicketsSection } from "@/components/cms/studio-page-sections";

export default function AdminTicketsPage() {
  return (
    <StudioPage
      title="Tickets"
      description="Verwalte Teilnehmer-Zugänge — einzelne Tickets oder Pools mit gemeinsamer Kapazität."
    >
      <StudioTicketsSection />
    </StudioPage>
  );
}
