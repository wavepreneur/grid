"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addTaskToLayerPack,
  deleteLayerPack,
  getTasksBlastRadius,
  listPackStationCodes,
  removeTaskFromLayerPack,
  reorderLayerPackItems,
  updateLayer1ItemGps,
  updateLayer1ItemStation,
  updateLayer3Item,
  updateLayerPack,
  updatePackItemTaskTitle,
} from "@/app/actions/cms/packs";
import { findDirectoryCityBySlugOrName, getDirectoryCity } from "@/app/actions/cms/cities";
import { GpsWaypointPicker } from "@/components/cms/gps/gps-waypoint-picker";
import { PackRouteOverview } from "@/components/cms/gps/pack-route-overview";
import { CitySearchSelect } from "@/components/cms/packs/city-search-select";
import { StudioDeleteModal } from "@/components/cms/shared/studio-delete-modal";
import { StudioButton, StudioError, StudioHint, StudioInput, StudioLabel, StudioSelect, StudioSuccess } from "@/components/cms/studio-ui";
import { IconDownload, IconKeyRound, IconMapPin, IconPlus, IconSave, IconTrash } from "@/components/cms/studio-icons";
import { defaultMapCenter, type GpsPin } from "@/lib/cms/gps-defaults";
import { BONUS_WHEN_OPTIONS, type BonusAudience, type BonusWhenType } from "@/lib/cms/bonus-bindings";
import type { DirectoryCity } from "@/lib/cms/city-directory";
import { parsePackItemOverrides, type StudioLayerPack, type StudioLayerPackItem } from "@/lib/cms/layer-packs";
import { useDebouncedValue, useTaskLibrarySearch } from "@/lib/hooks/use-task-library-search";
import { useInvalidateStudioPacks } from "@/lib/hooks/use-studio-packs";

type Props = {
  pack: StudioLayerPack;
  items: StudioLayerPackItem[];
};

export function PackEditor({ pack: initialPack, items: initialItems }: Props) {
  const invalidate = useInvalidateStudioPacks();
  const router = useRouter();
  const [pack, setPack] = useState(initialPack);
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState(initialPack.name);
  const [cityId, setCityId] = useState(initialPack.city_id);
  const [city, setCity] = useState<DirectoryCity | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [gpsOpenId, setGpsOpenId] = useState<string | null>(null);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [reach, setReach] = useState<Record<string, { packCount: number; gameCount: number }>>({});
  const debounced = useDebouncedValue(search, 200);
  const { data: library = [] } = useTaskLibrarySearch(debounced);

  useEffect(() => {
    const ids = [...new Set(items.map((item) => item.task_id))];
    if (ids.length === 0) return;
    void getTasksBlastRadius(ids).then((result) => {
      if (result.success) setReach(result.data ?? {});
    });
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (initialPack.city_id) {
        const byId = await getDirectoryCity(initialPack.city_id);
        if (!cancelled && byId.success && byId.data) {
          setCity(byId.data);
          setCityId(byId.data.id);
          return;
        }
      }
      const fallback = await findDirectoryCityBySlugOrName(initialPack.city_slug ?? "", initialPack.name);
      if (!cancelled && fallback.success && fallback.data) {
        setCity(fallback.data);
        setCityId(fallback.data.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPack.city_id, initialPack.city_slug, initialPack.name]);

  const usedTaskIds = useMemo(() => new Set(items.map((item) => item.task_id)), [items]);

  function saveMeta() {
    setError(null);
    startTransition(async () => {
      const result = await updateLayerPack({
        id: pack.id,
        name,
        city_id: pack.layer === 1 ? cityId : undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPack(result.data);
      setMessage("Pack gespeichert.");
      invalidate();
    });
  }

  function addTask(taskId: string) {
    startTransition(async () => {
      const result = await addTaskToLayerPack(pack.id, taskId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems(result.data ?? []);
      setSearch("");
      invalidate();
    });
  }

  function removeItem(itemId: string) {
    startTransition(async () => {
      const result = await removeTaskFromLayerPack(pack.id, itemId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems(result.data ?? []);
      invalidate();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) return;
    const a = next[index]!;
    next[index] = next[swap]!;
    next[swap] = a;
    setItems(next);
    startTransition(async () => {
      const result = await reorderLayerPackItems(
        pack.id,
        next.map((item) => item.id),
      );
      if (!result.success) setError(result.error);
      else setItems(result.data ?? next);
    });
  }

  return (
    <div className="space-y-6">
      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <StudioLabel>Name</StudioLabel>
            <StudioInput value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {pack.layer === 1 ? (
            <div>
              <StudioLabel hint="Nur aus Exitmania. Leer = Indoor-Pack ohne Stadt. GRID legt keine Städte an.">
                Exitmania-Stadt
              </StudioLabel>
              <CitySearchSelect
                value={cityId}
                selected={city}
                onChange={(next) => {
                  setCity(next);
                  setCityId(next?.id ?? null);
                }}
              />
              {city ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Gekoppelt: {city.name} · {city.country}
                  {city.slug ? ` · ${city.slug}` : ""}
                </p>
              ) : pack.city_slug ? (
                <p className="mt-1 text-xs text-muted-foreground">Aktueller Slug (kann sich ändern): {pack.city_slug}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StudioButton type="button" disabled={pending} onClick={saveMeta} icon={<IconSave size={16} />}>
            Name speichern
          </StudioButton>
          <StudioButton type="button" variant="ghost" icon={<IconTrash size={16} />} onClick={() => setDeleteOpen(true)}>
            Pack löschen
          </StudioButton>
        </div>
      </section>

      {pack.layer === 1 ? (
        <PackRouteOverview
          packId={pack.id}
          citySlug={pack.city_slug}
          items={items}
          disabled={pending}
          onSaved={setItems}
          onError={setError}
        />
      ) : null}

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">
          {pack.layer === 1 ? "Einstiegsaufgaben" : pack.layer === 2 ? "Mission-Stops" : "Boni"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {pack.layer === 1
            ? "Ort duplizieren kopiert die Einstiegsaufgaben. Dann Name, Frage, GPS und Code hier überschreiben. Dieselben Wegpunkte an ein anderes Spiel hängen — nicht duplizieren."
            : pack.layer === 2
              ? "Mission duplizieren kopiert alle Aufgaben. Anpassen, wenn du eine neue Mission brauchst. Dieselbe Mission an ein anderes Spiel hängen — nicht duplizieren."
              : "Team duplizieren kopiert alle Boni. Anpassen, wenn du eine neue Team-Variante brauchst. Denselben Team-Teil an ein anderes Spiel hängen — nicht duplizieren."}
        </p>
        {pack.layer === 1 ? (
          <div className="mt-3">
            <StudioButton
              type="button"
              size="sm"
              variant="secondary"
              icon={<IconDownload size={14} />}
              disabled={pending || items.length === 0}
              onClick={() => {
                startTransition(async () => {
                  const result = await listPackStationCodes(pack.id);
                  if (!result.success) {
                    setError(result.error);
                    return;
                  }
                  const rows = [
                    ["Station", "Aufgabe", "Code"],
                    ...(result.data?.cards ?? []).map((card) => [
                      String(card.index),
                      card.title,
                      card.code,
                    ]),
                  ];
                  const csv = rows
                    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"))
                    .join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const href = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = href;
                  link.download = `${pack.name.replaceAll(/\s+/g, "-").toLowerCase()}-codes.csv`;
                  link.click();
                  URL.revokeObjectURL(href);
                });
              }}
            >
              Codes herunterladen
            </StudioButton>
          </div>
        ) : null}
        <div className="mt-4 space-y-2">
          {items.map((item, index) => {
            const parsed = parsePackItemOverrides(item.overrides);
            const gps = parsed.gps;
            const stationCode = parsed.station?.code ?? "";
            const blast = reach[item.task_id];
            return (
              <div key={item.id} className="rounded-2xl border border-border px-3 py-3">
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    {pack.layer === 1 ? (
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div>
                          <StudioLabel>Name der Einstiegsaufgabe</StudioLabel>
                          <StudioInput
                            value={titleDrafts[item.id] ?? item.task.title}
                            onChange={(e) =>
                              setTitleDrafts((current) => ({ ...current, [item.id]: e.target.value }))
                            }
                          />
                        </div>
                        <StudioButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              const result = await updatePackItemTaskTitle(
                                pack.id,
                                item.id,
                                titleDrafts[item.id] ?? item.task.title,
                              );
                              if (!result.success) {
                                setError(result.error);
                                return;
                              }
                              setItems(result.data ?? items);
                              setMessage("Name gespeichert.");
                            });
                          }}
                        >
                          Name speichern
                        </StudioButton>
                      </div>
                    ) : (
                      <p className="font-semibold">{item.task.title}</p>
                    )}
                    {pack.layer === 1 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {gps
                          ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)} · ${gps.radius_meters} m`
                          : "Noch keine Koordinaten"}
                        {stationCode ? ` · Code ${stationCode}` : " · Code fehlt"}
                      </p>
                    ) : null}
                    {blast && blast.packCount > 1 ? (
                      <p className="mt-1 text-xs font-semibold text-amber-800">
                        Hängt noch in {blast.packCount} Packs
                        {blast.gameCount > 0
                          ? ` / ${blast.gameCount} Spiel${blast.gameCount === 1 ? "" : "e"}`
                          : ""}
                        .
                      </p>
                    ) : pack.layer === 1 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Name und Fragen gehören zu {pack.name}. GPS und Code nur hier.
                      </p>
                    ) : null}
                    <Link
                      href={`/app/tasks/${item.task_id}?returnTo=/app/packs/${pack.id}`}
                      className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Frage und Antworten bearbeiten
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pack.layer === 1 ? (
                      <StudioButton
                        type="button"
                        size="sm"
                        variant={gpsOpenId === item.id ? "secondary" : "ghost"}
                        icon={<IconMapPin size={14} />}
                        onClick={() => setGpsOpenId((current) => (current === item.id ? null : item.id))}
                      >
                        Koordinaten
                      </StudioButton>
                    ) : null}
                    <StudioButton type="button" size="sm" variant="ghost" onClick={() => move(index, -1)}>
                      Hoch
                    </StudioButton>
                    <StudioButton type="button" size="sm" variant="ghost" onClick={() => move(index, 1)}>
                      Runter
                    </StudioButton>
                    <StudioButton
                      type="button"
                      size="sm"
                      variant="danger"
                      icon={<IconTrash size={14} />}
                      onClick={() => removeItem(item.id)}
                    >
                      Weg
                    </StudioButton>
                  </div>
                </div>
                {pack.layer === 1 && gpsOpenId === item.id ? (
                  <div className="mt-3">
                    <PackItemGpsEditor
                      packId={pack.id}
                      itemId={item.id}
                      value={gps ?? null}
                      defaultCenter={
                        gps ??
                        items
                          .map((row) => parsePackItemOverrides(row.overrides).gps)
                          .find((pin): pin is GpsPin => Boolean(pin)) ??
                        defaultMapCenter(pack.city_slug)
                      }
                      disabled={pending}
                      onSaved={(next) => setItems(next)}
                      onError={setError}
                    />
                  </div>
                ) : null}
                {pack.layer === 1 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <StudioLabel hint="Indoor: Spieler tippt diesen Code. Outdoor ignoriert ihn. Teamevent kann ihn nur am Event tauschen.">
                        Stationscode
                      </StudioLabel>
                      <StudioInput
                        value={codeDrafts[item.id] ?? stationCode}
                        onChange={(e) =>
                          setCodeDrafts((current) => ({ ...current, [item.id]: e.target.value.toUpperCase() }))
                        }
                        placeholder="z. B. K7M2"
                      />
                    </div>
                    <StudioButton
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={<IconKeyRound size={14} />}
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await updateLayer1ItemStation(pack.id, item.id, {
                            code: codeDrafts[item.id] ?? stationCode,
                          });
                          if (!result.success) {
                            setError(result.error);
                            return;
                          }
                          setItems(result.data ?? items);
                          setMessage("Stationscode gespeichert.");
                        });
                      }}
                    >
                      Code speichern
                    </StudioButton>
                  </div>
                ) : null}
                {pack.layer === 3 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <StudioLabel>Mission-Slot</StudioLabel>
                      <StudioInput
                        type="number"
                        min={1}
                        value={(parsed.bind_slot ?? item.sort_order) + 1}
                        onChange={(e) => {
                          const bind_slot = Math.max(0, Number(e.target.value) - 1);
                          startTransition(async () => {
                            const result = await updateLayer3Item(pack.id, item.id, { bind_slot });
                            if (result.success) setItems(result.data ?? items);
                          });
                        }}
                      />
                    </div>
                    <div>
                      <StudioLabel>Wer</StudioLabel>
                      <StudioSelect
                        value={parsed.role ?? "gamma"}
                        onChange={(e) => {
                          const role = e.target.value as BonusAudience;
                          startTransition(async () => {
                            const result = await updateLayer3Item(pack.id, item.id, { role });
                            if (result.success) setItems(result.data ?? items);
                          });
                        }}
                      >
                        <option value="gamma">Gamma</option>
                        <option value="alpha">Alpha</option>
                        <option value="beta">Beta</option>
                        <option value="team">Team</option>
                      </StudioSelect>
                    </div>
                    <div>
                      <StudioLabel>Wann</StudioLabel>
                      <StudioSelect
                        value={parsed.when?.type ?? "immediate"}
                        onChange={(e) => {
                          const type = e.target.value as BonusWhenType;
                          startTransition(async () => {
                            const result = await updateLayer3Item(pack.id, item.id, { when: { type } });
                            if (result.success) setItems(result.data ?? items);
                          });
                        }}
                      >
                        {BONUS_WHEN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </StudioSelect>
                    </div>
                  </div>
                ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <StudioLabel>Aus dem Pool hinzufügen</StudioLabel>
          <StudioInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen…" />
          {library.length > 0 ? (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
              {library
                .filter((task) => !usedTaskIds.has(task.id))
                .slice(0, 16)
                .map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => addTask(task.id)}
                  >
                    <span className="truncate">{task.title}</span>
                    <IconPlus size={14} />
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      </section>

      <StudioDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
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
          startTransition(async () => {
            const result = await deleteLayerPack(pack.id);
            if (!result.success) {
              setError(result.error);
              return;
            }
            invalidate();
            router.push("/app/packs");
          });
        }}
      />
    </div>
  );
}

function PackItemGpsEditor({
  packId,
  itemId,
  value,
  defaultCenter,
  disabled,
  onSaved,
  onError,
}: {
  packId: string;
  itemId: string;
  value: GpsPin | null;
  defaultCenter: GpsPin;
  disabled?: boolean;
  onSaved: (items: StudioLayerPackItem[]) => void;
  onError: (message: string | null) => void;
}) {
  const [draft, setDraft] = useState<GpsPin>(value ?? defaultCenter);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (value) setDraft(value);
  }, [value]);

  function persist(next: GpsPin) {
    setDraft(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void updateLayer1ItemGps(packId, itemId, next).then((result) => {
        if (!result.success) {
          onError(result.error);
          return;
        }
        onError(null);
        onSaved(result.data ?? []);
      });
    }, 280);
  }

  return (
    <GpsWaypointPicker value={draft} defaultCenter={defaultCenter} onChange={persist} disabled={disabled} />
  );
}
