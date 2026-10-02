"use client";

import { useState } from "react";
import { createStudioCollection } from "@/app/actions/cms/collections";
import { StudioButton, StudioInput, StudioLabel } from "@/components/cms/studio-ui";
import { StudioSelect } from "@/components/cms/shared/studio-listbox";
import type { StudioCollection } from "@/lib/cms/collections";

type Props = {
  value: string | null;
  collections: StudioCollection[];
  onChange: (id: string | null) => void;
  onCreated?: (collection: StudioCollection) => void;
  hint?: string;
};

export function CollectionPicker({
  value,
  collections,
  onChange,
  onCreated,
  hint = "Gruppe für alle Städte dieses Spiels",
}: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await createStudioCollection({ name });
      if (!result.success || !result.data) {
        setError(result.error ?? "Collection konnte nicht erstellt werden.");
        return;
      }
      onCreated?.(result.data);
      onChange(result.data.id);
      setName("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StudioLabel hint={hint}>Collection</StudioLabel>
      <StudioSelect
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "__new") {
            setCreating(true);
            return;
          }
          setCreating(false);
          onChange(next || null);
        }}
      >
        <option value="">Keine Collection</option>
        {collections.map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.name}
          </option>
        ))}
        <option value="__new">Neue Collection…</option>
      </StudioSelect>
      {creating ? (
        <form onSubmit={handleCreate} className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <StudioInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. First Profiler"
              required
              minLength={2}
            />
          </div>
          <StudioButton type="submit" size="sm" disabled={saving}>
            {saving ? "Wird angelegt…" : "Anlegen"}
          </StudioButton>
          <StudioButton
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setCreating(false);
              setName("");
              setError(null);
            }}
          >
            Abbrechen
          </StudioButton>
        </form>
      ) : null}
      {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
