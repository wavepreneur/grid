"use client";

import { StudioModal } from "@/components/cms/shared/studio-modal";
import { StudioButton } from "@/components/cms/studio-ui";
import { GameLogicFlowCanvas } from "@/components/cms/games/game-logic-flow-canvas";
import type { StudioLayer } from "@/lib/cms/layer-model";
import type { StudioGameTaskLink } from "@/lib/cms/types";

type Props = {
  open: boolean;
  onClose: () => void;
  links: StudioGameTaskLink[];
  activeLayers: StudioLayer[];
};

export function GameLogicFlowModal({ open, onClose, links, activeLayers }: Props) {
  return (
    <StudioModal
      open={open}
      onClose={onClose}
      size="xl"
      title="Spiel-Logik — Übersicht"
      subtitle="Verbindungslinien zeigen Reihenfolge (Mission), Bonus-Trigger und Geo-Freischaltung."
      footer={
        <StudioButton type="button" variant="secondary" onClick={onClose}>
          Schließen
        </StudioButton>
      }
    >
      <GameLogicFlowCanvas links={links} activeLayers={activeLayers} />
    </StudioModal>
  );
}
