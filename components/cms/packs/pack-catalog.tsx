"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLayerPack, deleteLayerPack, duplicateLayerPacks, updateLayerPack } from "@/app/actions/cms/packs";
import { CitySearchSelect } from "@/components/cms/packs/city-search-select";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { StudioDuplicateModal } from "@/components/cms/shared/studio-duplicate-modal";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import { IconCopy, IconPlus, IconSearch, IconTrash } from "@/components/cms/studio-icons";
import { inputCls } from "@/components/cms/ui";
import { cityLabelDe, type DirectoryCity } from "@/lib/cms/city-directory";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { layerPackHintDe, layerPackTitleDe, type StudioLayerPack } from "@/lib/cms/layer-packs";
import { useInvalidateStudioPacks, useStudioLayerPacks } from "@/lib/hooks/use-studio-packs";

const LAYERS: StudioLayer[] = [1, 2, 3];

export function PackCatalog() {
  const router = useRouter();
  const invalidate = useInvalidateStudioPacks();
  const [layer, setLayer] = useState<StudioLayer>(1);
  const [search, setSearch] = useState("");
  const packsQuery = useStudioLayerPacks(layer, search);
  const packs = packsQuery.data ?? [];
  const [name, setName] = useState("");
  const [city, setCity] = useState<DirectoryCity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudioLayerPack | null>(null);

  const sorted = useMemo(
    () => [...packs].sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" })),
    [packs],
  );

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createLayerPack({
        layer,
        name: name.trim() || (city ? cityLabelDe(city) : ""),
        city_id: layer === 1 ? city?.id ?? null : null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      setCity(null);
      invalidate();
      router.push(`/admin/packs/${result.data.id}`);
    });
  }

  const canCreate = layer === 1 ? Boolean(city) : Boolean(name.trim());

  return (
    <div className="space-y-5">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <div className="flex flex-wrap gap-2">
        {LAYERS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setLayer(id);
              setSearch("");
              setName("");
              setCity(null);
            }}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${
              layer === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {layerPackTitleDe(id)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{layerPackHintDe(layer)}</p>

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">Neu anlegen</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {layer === 1 ? (
            <div>
              <StudioLabel hint="Exitmania-Stadt, nicht der URL-Slug">Stadt</StudioLabel>
              <CitySearchSelect
                value={city?.id ?? null}
                selected={city}
                onChange={(next) => {
                  setCity(next);
                  if (next && (!name.trim() || (city && name.trim() === cityLabelDe(city)))) {
                    setName(cityLabelDe(next));
                  }
                }}
              />
            </div>
          ) : null}
          <div>
            <StudioLabel hint="Kann den Vorschlag überschreiben">Name</StudioLabel>
            <StudioInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={layer === 1 ? "München" : layer === 2 ? "First Profiler" : "Team Basic"}
            />
          </div>
        </div>
        <div className="mt-4">
          <StudioButton type="button" disabled={pending || !canCreate} onClick={handleCreate} icon={<IconPlus size={16} />}>
            Pack anlegen
          </StudioButton>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={layer === 1 ? "Stadt suchen…" : "Pack suchen…"}
            className={`${inputCls} mt-0 border-0 bg-secondary pl-11 shadow-none`}
          />
        </div>
        <StudioHint tone="info">
          {layer === 1
            ? "Pack löschen hängt nur das Bündel ab — Aufgaben und Spiele bleiben. Name ist überschreibbar."
            : "Mission und Team gibt es wenige. Dieselben Packs docken an jede Stadt — nicht kopieren."}
        </StudioHint>
        <div className="mt-3 space-y-2">
          {packsQuery.isPending && sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Laden…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Packs in diesem Layer.</p>
          ) : (
            sorted.map((pack) => (
              <PackCatalogRow
                key={pack.id}
                pack={pack}
                pending={pending}
                onRename={(nextName) => {
                  startTransition(async () => {
                    const result = await updateLayerPack({ id: pack.id, name: nextName });
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    invalidate();
                  });
                }}
                onDuplicate={() => {
                  setDuplicateId(pack.id);
                  setDuplicateOpen(true);
                }}
                onDelete={() => {
                  setDeleteTarget(pack);
                  setDeleteOpen(true);
                }}
              />
            ))
          )}
        </div>
      </section>

      <StudioDuplicateModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        itemLabel={layer === 1 ? "Stadt-Pack" : "Pack"}
        selectedCount={1}
        pending={pending}
        extra={
          <p className="mt-3 text-sm text-slate-600">
            {layer === 1
              ? "Kopiert Aufgaben, Reihenfolge und Bedingungen (Meter, Opener, Codes). Inhalt danach in Aufgaben anpassen, Koordinaten im Spiel neu setzen."
              : "Mission und Team nicht kopieren, wenn du nur eine Stadt brauchst — im Spiel andocken."}
          </p>
        }
        onConfirm={(count) => {
          if (!duplicateId) return;
          startTransition(async () => {
            const result = await duplicateLayerPacks([duplicateId], count);
            if (!result.success) {
              setError(result.error);
              return;
            }
            setDuplicateOpen(false);
            setMessage(`${result.data?.createdCount ?? 0} Pack(s) angelegt.`);
            invalidate();
            const id = result.data?.createdIds[0];
            if (id && (result.data?.createdCount ?? 0) === 1) router.push(`/admin/packs/${id}`);
          });
        }}
      />

      <StudioDeleteModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        title="Pack löschen?"
        count={1}
        itemLabel="Pack"
        pending={pending}
        warnings={
          <StudioHint tone="info">
            Aufgaben bleiben. Spiele behalten ihre anderen Packs — dieses Pack wird nur abgekoppelt.
          </StudioHint>
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteLayerPack(deleteTarget.id);
            if (!result.success) {
              setError(result.error);
              return;
            }
            setDeleteOpen(false);
            setDeleteTarget(null);
            setMessage("Pack gelöscht.");
            invalidate();
          });
        }}
      />
    </div>
  );
}

function PackCatalogRow({
  pack,
  pending,
  onRename,
  onDuplicate,
  onDelete,
}: {
  pack: StudioLayerPack;
  pending: boolean;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pack.name);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === pack.name) {
      setDraft(pack.name);
      return;
    }
    onRename(next);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(pack.name);
                setEditing(false);
              }
            }}
            className={`${inputCls} mt-0 h-9 border-0 bg-background px-3 text-sm font-semibold shadow-none`}
          />
        ) : (
          <button
            type="button"
            className="block w-full truncate text-left font-semibold"
            onClick={() => {
              setDraft(pack.name);
              setEditing(true);
            }}
          >
            {pack.name}
          </button>
        )}
        <Link href={`/admin/packs/${pack.id}`} className="text-xs text-muted-foreground hover:underline">
          Öffnen · {pack.city_slug ? pack.city_slug : "geteilt"} · {pack.slot_count} Stops
        </Link>
      </div>
      <div className="flex flex-wrap gap-1">
        <StudioButton type="button" size="sm" variant="ghost" icon={<IconCopy size={14} />} onClick={onDuplicate}>
          Duplizieren
        </StudioButton>
        <StudioButton type="button" size="sm" variant="ghost" icon={<IconTrash size={14} />} onClick={onDelete}>
          Löschen
        </StudioButton>
      </div>
    </div>
  );
}
