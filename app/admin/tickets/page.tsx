import { StudioPage } from "@/components/cms/studio-page";
import { TicketPoolsPanel } from "@/components/cms/tickets/ticket-pools-panel";
import { listGames } from "@/app/actions/cms/games";
import { listTicketPools } from "@/app/actions/cms/tickets";

export default async function AdminTicketsPage() {
  const [poolsResult, gamesResult] = await Promise.all([listTicketPools(), listGames()]);

  return (
    <StudioPage
      activePath="/admin/tickets"
      title="Tickets"
      description="Verwalte Teilnehmer-Zugänge — einzelne Tickets oder Pools mit gemeinsamer Kapazität."
    >
      <TicketPoolsPanel
        pools={poolsResult.success ? poolsResult.data! : []}
        games={gamesResult.success ? gamesResult.data! : []}
      />
    </StudioPage>
  );
}
