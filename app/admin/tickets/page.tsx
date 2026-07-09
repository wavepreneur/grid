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
      description="Kapazität & Aktivierungen — Einzel-Tickets oder Pools (z. B. 3.000 Tabbrain-Slots)."
    >
      <TicketPoolsPanel
        pools={poolsResult.success ? poolsResult.data! : []}
        games={gamesResult.success ? gamesResult.data! : []}
      />
    </StudioPage>
  );
}
