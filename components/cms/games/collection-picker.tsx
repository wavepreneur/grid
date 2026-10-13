"use client";

import { useMemo, useState } from "react";
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
  const [created, setCreated] = useState<StudioCollection[]>([]);

  const options = useMemo(() => {
    const seen = new Set(collections.map((collection) => collection.id));
    return [...collections, ...created.filter((collection) => !seen.has(collection.id))];
  }, [collections, created]);

  async function handleCreate() {
    setError(null);
    setSaving(true);
    try {
      const result = await createStudioCollection({ name });
      if (!result.success) {
        setError(result.error ?? "Collection konnte nicht erstellt werden.");
        return;
      }
      if (!result.data) {
        setError("Collection konnte nicht erstellt werden.");
        return;
      }
      setCreated((current) => [...current, result.data!]);
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
        {options.map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.name}
          </option>
        ))}
        <option value="__new">Neue Collection…</option>
      </StudioSelect>
      {creating ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <StudioInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleCreate();
                }
              }}
              placeholder="z. B. KIRA"
              required
              minLength={2}
            />
          </div>
          <StudioButton type="button" size="sm" disabled={saving} onClick={() => void handleCreate()}>
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
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
