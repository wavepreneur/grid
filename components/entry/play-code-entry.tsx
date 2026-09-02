"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resolvePlayAccessCode } from "@/app/actions/access";
import { GridButton, GridError, GridInput } from "@/components/grid/grid-shell";
import { IconArrowRight } from "@/components/cms/studio-icons";
import { normalizeCode } from "@/lib/grid/codes";

export function PlayCodeEntry({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (normalized.length < 4) return;
    setError(null);
    startTransition(async () => {
      const result = await resolvePlayAccessCode(normalized);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(result.data.path);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <GridInput
        value={code}
        onChange={(event) => setCode(normalizeCode(event.target.value))}
        placeholder="CODE"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={10}
        aria-label="Zugangscode"
      />
      {error ? <GridError message={error} /> : null}
      <GridButton
        type="submit"
        disabled={pending || code.trim().length < 4}
        icon={<IconArrowRight size={16} />}
      >
        {pending ? "Prüfe…" : "Weiter"}
      </GridButton>
    </form>
  );
}
