"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GridButton,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";
import { normalizeCode } from "@/lib/grid/codes";

type TeamCodeEntryProps = {
  inviteCode: string;
};

export function TeamCodeEntry({ inviteCode }: TeamCodeEntryProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeCode(joinCode);
    if (!normalized) return;
    router.push(`/join/${inviteCode}?team=${normalized}`);
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
