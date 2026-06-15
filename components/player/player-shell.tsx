"use client";

import type { ReactNode } from "react";
import { IdentityBar } from "@/components/player/identity-bar";
import type { PlayerSession } from "@/lib/grid/types";

type PlayerShellProps = {
  inviteCode: string;
  joinCode: string;
  session?: PlayerSession | null;
  showManageTeam?: boolean;
  children: ReactNode;
};

export function PlayerShell({
  inviteCode,
  joinCode,
  session,
  showManageTeam = true,
  children,
}: PlayerShellProps) {
  return (
    <div className="flex flex-col gap-5">
      {session ? (
        <IdentityBar
          inviteCode={inviteCode}
          joinCode={joinCode}
          session={session}
          showManageTeam={showManageTeam}
        />
      ) : null}
      {children}
    </div>
  );
}
