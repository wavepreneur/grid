import { StudioPage } from "@/components/cms/studio-page";
import { StudioTicketsSection } from "@/components/cms/studio-page-sections";

export default function AdminTicketsPage() {
  return (
    <StudioPage
      title="Tickets"
      description="Codes erzeugen, verteilen und sehen, wer wann reingegangen ist. Spieler tippen den Code auf /go."
    >
      <StudioTicketsSection />
    </StudioPage>
  );
}
