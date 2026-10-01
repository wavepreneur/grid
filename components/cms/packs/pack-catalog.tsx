"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLayerPack, deleteLayerPack, duplicateLayerPacks, updateLayerPack } from "@/app/actions/cms/packs";
import { ComposeGamesPanel } from "@/components/cms/packs/compose-games-panel";
import { SplitGamePanel } from "@/components/cms/packs/split-game-panel";
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
import { StudioSortMenu, type StudioSortOption } from "@/components/cms/shared/studio-sort-menu";
import { IconAlpha, IconClock, IconCopy, IconPlus, IconSearch, IconTrash } from "@/components/cms/studio-icons";
import { inputCls } from "@/components/cms/ui";
import { cityLabelDe, type DirectoryCity } from "@/lib/cms/city-directory";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { layerPackHintDe, layerPackTitleDe, type StudioLayerPack } from "@/lib/cms/layer-packs";
import { useInvalidateStudioPacks, useStudioLayerPacks } from "@/lib/hooks/use-studio-packs";

const LAYERS: StudioLayer[] = [1, 2, 3];

type PackSort = "updated" | "stale" | "name" | "name-desc";

const SORT_OPTIONS: Array<StudioSortOption<PackSort>> = [
  {
    id: "updated",
    label: "Zuletzt bearbeitet",
    description: "Neueste Änderungen zuerst",
    icon: <IconClock size={15} />,
  },
  {
    id: "stale",
    label: "Lange nicht bearbeitet",
    description: "Älteste Änderungen zuerst",
    icon: <IconClock size={15} />,
  },
  {
    id: "name",
    label: "Name (A–Z)",
    description: "Alphabetisch nach Titel",
    icon: <IconAlpha size={15} />,
  },
  {
    id: "name-desc",
    label: "Name (Z–A)",
    description: "Alphabetisch rückwärts",
    icon: <IconAlpha size={15} />,
  },
];

function sortPacks(list: StudioLayerPack[], sort: PackSort): StudioLayerPack[] {
  const next = [...list];
  switch (sort) {
    case "stale":
      return next.sort(
        (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      );
    case "name":
      return next.sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true, sensitivity: "base" }));
    case "name-desc":
      return next.sort((a, b) => b.name.localeCompare(a.name, "de", { numeric: true, sensitivity: "base" }));
    case "updated":
    default:
      return next.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  }
}

export function PackCatalog() {
  const router = useRouter();
  const invalidate = useInvalidateStudioPacks();
  const [layer, setLayer] = useState<StudioLayer>(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PackSort>("updated");
  const packsQuery = useStudioLayerPacks(layer, search);
  const packs = packsQuery.data ?? [];
  const [name, setName] = useState("");
  const [city, setCity] = useState<DirectoryCity | null>(null);
  const [packKind, setPackKind] = useState<"outdoor" | "indoor">("outdoor");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudioLayerPack | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);

  const sorted = useMemo(() => sortPacks(packs, sort), [packs, sort]);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createLayerPack({
        layer,
        name: name.trim() || (city ? cityLabelDe(city) : ""),
        city_id: layer === 1 && packKind === "outdoor" ? city?.id ?? null : null,
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

  const canCreate =
    layer === 1
      ? packKind === "outdoor"
        ? Boolean(city)
        : Boolean(name.trim())
      : Boolean(name.trim());

  return (
    <div className="space-y-5">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <SplitGamePanel />

      <ComposeGamesPanel />

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Vorrat</p>
        <h2 className="mt-1 text-xl font-bold">Deine Bestandteile</h2>
        <p className="mt-1 text-sm text-muted-foreground">{layerPackHintDe(layer)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LAYERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setLayer(id);
                setSearch("");
                setName("");
                setCity(null);
                setPackKind("outdoor");
              }}
              className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${
                layer === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {layerPackTitleDe(id)}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-4 shadow-soft">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bestandteil suchen…"
            className={`${inputCls} mt-0 border-0 bg-secondary pl-11 shadow-none`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[16rem] flex-1">
            <StudioHint tone="info">
              {layer === 1
                ? "Deine benannten Orte. Im Rezept oben wählst du sie über Ort."
                : "Die Namen, die du beim Aufteilen vergeben hast. Im Rezept oben wählst du sie über Mission oder Team."}
            </StudioHint>
          </div>
          <StudioSortMenu value={sort} options={SORT_OPTIONS} onChange={setSort} />
        </div>
        <div className="mt-3 space-y-2">
          {packsQuery.isPending && sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Laden…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch kein Bestandteil. Teile zuerst ein Spiel.</p>
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
        itemLabel={layer === 1 ? "Ort" : layer === 2 ? "Mission" : "Team"}
        selectedCount={1}
        pending={pending}
        extra={
          <p className="mt-3 text-sm text-slate-600">
            {layer === 1
              ? "Kopiert Ort plus Einstiegsaufgaben. GPS wird geleert, Codes neu. Dieselben Wegpunkte an ein anderes Spiel hängen — nicht duplizieren."
              : layer === 2
                ? "Kopiert Mission plus alle Aufgaben. Dieselbe Mission an ein anderes Spiel hängen — nicht duplizieren."
                : "Kopiert Team plus alle Boni. Denselben Team-Teil an ein anderes Spiel hängen — nicht duplizieren."}
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
            setMessage(`${result.data?.createdCount ?? 0} Bestandteil(e) angelegt.`);
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
        title="Bestandteil löschen?"
        count={1}
        itemLabel="Bestandteil"
        pending={pending}
        warnings={
          <StudioHint tone="info">
            Zutaten bleiben. Spiele behalten ihre anderen Teile — dieser wird nur abgekoppelt.
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
            setMessage("Bestandteil gelöscht.");
            invalidate();
          });
        }}
      />

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <button
          type="button"
          onClick={() => setExtraOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left"
        >
          <span>
            <span className="block text-sm font-bold">Ohne Spiel anlegen</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Nur für einen extra Ort oder Indoor-Codes — Mission und Team kommen vom Aufteilen.
            </span>
          </span>
          <span className="text-sm font-bold text-primary">{extraOpen ? "Zuklappen" : "Öffnen"}</span>
        </button>
        {extraOpen ? (
          <div className="mt-4">
            {layer === 1 ? (
              <div className="flex w-fit rounded-2xl bg-secondary p-1">
                {(["outdoor", "indoor"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setPackKind(kind);
                      if (kind === "indoor") setCity(null);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      packKind === kind ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                    }`}
                  >
                    {kind === "outdoor" ? "Outdoor · Stadt" : "Indoor · Codes"}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {layer === 1 && packKind === "outdoor" ? (
                <div>
                  <StudioLabel hint="Live-Suche in Exitmania. GRID speichert die Stadt nicht neu.">
                    Exitmania-Stadt
                  </StudioLabel>
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
                <StudioLabel hint={layer === 1 && packKind === "outdoor" ? "Name des Bestandteils, nicht der Ortsname in Exitmania" : undefined}>
                  Name
                </StudioLabel>
                <StudioInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    layer === 1
                      ? packKind === "indoor"
                        ? "z. B. Museum Stationen"
                        : "wird aus der Stadt vorausgefüllt"
                      : layer === 2
                        ? "First Profiler"
                        : "Team Basic"
                  }
                />
              </div>
            </div>
            <div className="mt-4">
              <StudioButton type="button" disabled={pending || !canCreate} onClick={handleCreate} icon={<IconPlus size={16} />}>
                Bestandteil anlegen
              </StudioButton>
            </div>
          </div>
        ) : null}
      </section>
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
