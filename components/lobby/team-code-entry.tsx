"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GridButton,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { eventTeamJoinPath } from "@/lib/grid/event-routes";

type TeamCodeEntryProps = {
  inviteCode: string;
};

export function TeamCodeEntry({ inviteCode }: TeamCodeEntryProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = joinCode.trim().toUpperCase();
    if (normalized.length < 4) return;
    router.push(eventTeamJoinPath(inviteCode, normalized));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <GridLabel>Team-Code eingeben</GridLabel>
      <GridInput
        value={joinCode}
        onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
        placeholder="z. B. 7K2MNP"
        maxLength={8}
      />
      <GridButton type="submit">Team beitreten</GridButton>
    </form>
  );
}
